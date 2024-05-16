import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, In, Repository } from 'typeorm';
import { addDays, differenceInDays, format } from 'date-fns';

import {
  InvoiceHistoryStatusApproval,
  InvoiceLabel,
  InvoiceProcess,
  InvoiceStatus,
  NotificationActionStatus,
  NotificationType,
  OtifStatus,
  PaymentHistoryPaymentStatus,
  ShipmentSellingPriceType,
  ShipmentType,
  ShipmentVia,
  TempActiveFinish,
  TemporaryProformaStatus,
  TypeOfPayment,
  TypeOfPaymentDay,
} from 'src/enums/enum';

import { Quotation } from 'src/entities/quotation.entity';
import { ShipmentSelllingPrice } from 'src/entities/shipment-selling-price.entity';
import { Shipment } from 'src/entities/shipment.entity';
import { Invoice } from 'src/entities/invoice.entity';
import { Bank } from 'src/entities/bank.entity';
import { PaymentHistory } from 'src/entities/payment-history.entity';

import { CreateInvoiceDto } from './dtos/create-invoice.dto';
import { SettleInvoiceDto } from './dtos/settle-invoice.dto';
import { UpdateIssuedInvoiceDto } from './dtos/update-issued-invoice.dto';
import { UpdateInvoiceDto } from './dtos/update-invoice.dto';
import { UpdatePaymentHistoryStatusDto } from './dtos/update-payment-history-status.dto';
import { CurrentUserDto } from '../auth/dtos/current-user.dto';

import { Helper } from '../helpers/helper';

import { S3Service } from 'src/s3/s3.service';
import { WhatsappService } from 'src/whatsapp/whatsapp.service';
import { PdfService } from 'src/pdf/pdf.service';
import { MailService } from '../../mail/mail.service';
import { ShipmentHistoryService } from '../shipment-history/shipment-history.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ShipmentSellingPricesService } from '../shipment-selling-prices/shipment-selling-prices.service';
import { InvoicePrice } from 'src/entities/invoice-price.entity';
import { OriginDestinationService } from '../origin-destination/origin-destination.service';
import { ShareProformaDto } from './dtos/share-proforma.dto';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice) private invoiceRepo: Repository<Invoice>,
    @InjectRepository(Quotation) private quotationRepo: Repository<Quotation>,
    @InjectRepository(Bank) private bankRepo: Repository<Bank>,
    @InjectRepository(Shipment) private shipmentRepo: Repository<Shipment>,
    @InjectRepository(ShipmentSelllingPrice)
    private shipmentSellingPriceRepo: Repository<ShipmentSelllingPrice>,
    @InjectRepository(PaymentHistory)
    private paymentHistoryRepo: Repository<PaymentHistory>,
    @InjectRepository(InvoicePrice)
    private invoicePriceRepo: Repository<InvoicePrice>,
    private whatsappService: WhatsappService,
    private pdfService: PdfService,
    private mailService: MailService,
    private s3Service: S3Service,
    private connection: Connection,
    private helper: Helper,
    private shipmentHistoryService: ShipmentHistoryService,
    private notificationsService: NotificationsService,
    private shipmentSellingPricesService: ShipmentSellingPricesService,
    private originDestinationService: OriginDestinationService,
  ) {}

  // 1. split invoice
  // 2. create invoice
  async create(user: CurrentUserDto, body: CreateInvoiceDto) {
    const {
      rfqNumber,
      customerId,
      defaultPpn,
      ppn,
      exchangeRate,
      sellingPrices,
      thirdPartyId,
      currency,
      referenceNumber,
    } = body;

    const quotation = await this.quotationRepo
      .createQueryBuilder('q')
      .innerJoin('q.shipment', 's')
      .innerJoin('q.customer', 'c')
      .leftJoin('c.user', 'u', 'u.userStatus = :userStatus', {
        userStatus: 'USERVERIFICATION',
      })
      .select([
        'q.countryFrom',
        'q.countryTo',
        's.defaultPpn',
        's.ppn',
        's.currency',
        's.exchangeRate',
        'c.id',
        'u.customerLogin',
      ])
      .where(
        `
        q.rfqNumber = :rfqNumber
        AND q.customerId = :customerId
        AND q.status = :status
        AND s.status = :status
        AND q.companyId = :companyId
      `,
      )
      .setParameters({
        rfqNumber,
        customerId,
        status: 1,
        companyId: user.companyId,
      })
      .getOne();

    if (!quotation) {
      throw new BadRequestException('Quotation not found');
    }

    const isIdr = quotation.shipment.currency === 'IDR';

    let invoiceNumber = 'JKTFF';

    const invoice = await this.invoiceRepo
      .createQueryBuilder('i')
      .select(['i.id', 'i.invoiceNumber'])
      // .where('i.createdByCompanyId = :createdByCompanyId')
      .where("i.rfqNumber IS NOT NULL")
      .setParameters({
        createdByCompanyId: user.companyId,

      })
      .orderBy('i.id', 'DESC')
      .getOne();

    if (invoice) {
      const nextNumber = +invoice.invoiceNumber.split('FF').pop() + 1;
      invoiceNumber += `${nextNumber}`.padStart(7, '0');
    } else {
      invoiceNumber += '0000001';
    }

    let total = 0;
    let totalCurrency = 0;
    let previousPrice = 0;
    let lastPrice = 0;
    let previousSellingPrices: ShipmentSelllingPrice[];

    const invoicePricesValue = [];

    if (sellingPrices?.length) {
      // 1. split as profroma invoice
      const tempInvoiceIds = [];

      sellingPrices.forEach((el) => {
        const convertedPrice = Math.floor(el.price * exchangeRate);
        const subtotal = isIdr ? el.price * el.qty : convertedPrice * el.qty;
        const subtotalCurrency = Math.round(el.price * el.qty);
        const ppn = body.defaultPpn ? body.ppn : el.ppn;
        const obj = Object.assign(el, {
          rfqNumber,
          invoiceNumber,
          convertedPrice: isIdr ? el.price : convertedPrice,
          subtotal,
          ppn,
          subtotalCurrency,
          total: subtotal + (ppn / 100) * subtotal,
          totalCurrency: subtotalCurrency,
          createdByUserId: user.userId,
        });

        invoicePricesValue.push(obj);

        total += obj.total;
        totalCurrency += obj.totalCurrency;

        if (el.id) {
          tempInvoiceIds.push(el.id);
        }
      });
      invoicePricesValue.forEach((value) => {
        delete value.id;
      });
      previousSellingPrices = await this.shipmentSellingPriceRepo.findByIds(
        tempInvoiceIds,
      );
      previousSellingPrices.forEach((el) => {
        el.type = ShipmentSellingPriceType.INVOICE;
        el.updatedByUserId = user.userId;
      });
      console.log(`previousSellingPrices SPLIT ${rfqNumber}`, previousSellingPrices);
    } else {
      // 2. create the rest as prforma invoice
      previousSellingPrices = await this.shipmentSellingPriceRepo.find({
        rfqNumber,
        type: ShipmentSellingPriceType.TEMP_INVOICE,
        status: 1,
      });

      previousSellingPrices.forEach((el) => {
        total += +el.total;
        totalCurrency += +el.totalCurrency;

        invoicePricesValue.push({
          rfqNumber,
          invoiceNumber,
          priceComponent: el.priceComponent,
          uom: el.uom,
          price: el.price,
          convertedPrice: el.convertedPrice,
          qty: el.qty,
          subtotal: el.subtotal,
          subtotalCurrency: el.subtotalCurrency,
          ppn: el.ppn,
          total: el.total,
          totalCurrency: el.totalCurrency,
          note: el.note,
          createdByUserId: user.userId,
        });

        el.type = ShipmentSellingPriceType.INVOICE;
        el.updatedByUserId = user.userId;
      });

      console.log(
        `previousSellingPrices create the rest ${rfqNumber}`,
        previousSellingPrices,
      );
    }

    const invoicePrices = this.invoicePriceRepo.create(invoicePricesValue);
    const newInvoice = this.invoiceRepo.create({
      rfqNumber,
      customerId,
      invoiceNumber,
      createdByCompanyId: user.companyId,
      createdByUserId: user.userId,
      total,
      totalCurrency,
      thirdPartyId,
      referenceNumber,
      defaultPpn: defaultPpn ?? quotation.shipment.defaultPpn,
      ppn: ppn ?? quotation.shipment.ppn,
      currency: body.currency ?? quotation.shipment.currency,
      exchangeRate: exchangeRate ?? quotation.shipment.exchangeRate,
      remainingAmount: total.toString(),
      remainingAmountCurrency: totalCurrency.toString(),
      invoiceStatus: InvoiceStatus.PROFORMA,
      invoiceProcess: InvoiceProcess.PROFORMA_READY,
    });
    return await this.connection.transaction(async (entityManager) => {
      await entityManager.save(previousSellingPrices);
      const invoice = await entityManager.save(newInvoice);
      const ip = await entityManager.save(invoicePrices);
      console.log(`saved invoice prices ${rfqNumber}`, ip);
      // this.sendProformaInvoice(user, invoiceNumber);

      // if (user.customerModule && quotation.customer.user?.customerLogin) {
      //   this.notificationsService.create({
      //     customerId,
      //     type: NotificationType.INVOICE,
      //     invoiceNumber,
      //     invoiceStatus: InvoiceStatus.PROFORMA,
      //     countryFrom: quotation.countryFrom,
      //     countryTo: quotation.countryTo,
      //     actionStatus: NotificationActionStatus.PROFORMA_INVOICE_ISSUED,
      //     isRead: false,
      //     createdAt: new Date(),
      //     createdBy: user.userId,
      //   });
      // }

      this.shipmentHistoryService.submit(user.userId, rfqNumber, {
        description: `Issued proforma invoice : ${invoiceNumber}`,
        details: null,
      });

      return invoice
    });
  }

  // share Proforma Invoice
  async shareProforma(
    user: CurrentUserDto,
    body: ShareProformaDto,
    invoiceNumber: string,
  ) {
    let invoice = await this.invoiceRepo
      .createQueryBuilder('i')
      .innerJoin('i.customer', 'c')
      .innerJoin('i.shipment', 's')
      .innerJoin('i.quotation', 'q')
      .innerJoin(
        'i.invoicePrices',
        'ip',
        'ip.status = :status AND ip.invoiceHistoryId is NULL',
      )
      .leftJoinAndSelect('i.thirdParties', 'tp')
      .where(
        `
        i.invoiceNumber = :invoiceNumber
        AND i.status = :status
        AND q.companyId = :companyId
        AND s.status = :status
        AND q.status = :status
      `,
      )
      .setParameters({
        invoiceNumber,
        status: 1,
        companyId: user.companyId,
      })
      .orderBy('ip.id', 'ASC')
      .getOne();
    if (!invoice) {
      throw new NotFoundException('Invoice not found!');
    }

    if (invoice.thirdParties) {
      invoice.invoiceProcess = InvoiceProcess.TO_BE_ISSUED;
      this.invoiceRepo.save(invoice);
      this.sendProformaInvoice(
        user,
        invoiceNumber,
        true,
        InvoiceProcess.TO_BE_ISSUED,
        body?.email,
      );
      return {
        status: 'success',
        message: 'Proforma invoice has been sent to third party',
      };
    }

    invoice.invoiceProcess = InvoiceProcess.WAITING_APPROVAL;
    this.invoiceRepo.save(invoice);
    this.sendProformaInvoice(
      user,
      invoiceNumber,
      false,
      InvoiceProcess.WAITING_APPROVAL,
    );
    return {
      status: 'success',
      message: 'Proforma invoice has been sent to customer',
    };
  }

  async settleInvoice(
    invoiceNumber: string,
    data: SettleInvoiceDto,
    upload: any,
    user: CurrentUserDto,
  ) {
    let invoice = await this.invoiceRepo
      .createQueryBuilder('i')
      .innerJoin('i.customer', 'c')
      .innerJoin('i.shipment', 's')
      .innerJoin('i.quotation', 'q')
      .innerJoin(
        'i.invoicePrices',
        'ip',
        'ip.status = :status AND ip.invoiceHistoryId is NULL',
      )
      .where(
        `
        i.invoiceNumber = :invoiceNumber
        AND i.status = :status
        AND q.companyId = :companyId
        AND s.status = :status
        AND q.status = :status
      `,
      )
      .setParameters({
        invoiceNumber,
        status: 1,
        companyId: user.companyId,
      })
      .orderBy('ip.id', 'ASC')
      .getOne();

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    if (invoice.invoiceStatus === InvoiceStatus.PROFORMA) {
      throw new BadRequestException('Invoice has not been issued');
    }
    if (invoice.invoiceStatus === InvoiceStatus.SETTLED) {
      throw new BadRequestException('Invoice has already been settled');
    }
    if (invoice.paidCurrency && invoice.paidCurrency !== data.paymentCurrency) {
      throw new BadRequestException(
        'Paid currency must be same as previous payment',
      );
    }

    const { paymentDate, bank, bankHolder, settledAmount } = data;

    const exchangeRate = invoice.exchangeRate;

    if (isNaN(parseInt(settledAmount))) {
      throw new BadRequestException('Settled amount has to be a number');
    }

    await this.s3Service.uploadFiles([upload]);

    const bankEntity = await this.bankRepo.findOne({
      where: {
        name: bank,
        status: 1,
      },
    });

    const fileContainer = 'saas';
    const fileName = upload.hashedFileName;

    if (data.paymentCurrency === 'IDR') {
      if (Number(settledAmount) > Number(invoice.remainingAmount)) {
        throw new BadRequestException(
          'The payment you entered exceeds the remaining payable amount',
        );
      }
    } else {
      if (Number(settledAmount) > Number(invoice.remainingAmountCurrency)) {
        throw new BadRequestException(
          'The payment you entered exceeds the remaining payable amount',
        );
      }
    }

    const totalPaidAmount = await this.getTotalPaidAmount(
      invoiceNumber,
      settledAmount,
      data.paymentCurrency,
    );
    const remainingAmount =
      Number(invoice.remainingAmount) -
      (data.paymentCurrency === 'IDR'
        ? Number(settledAmount)
        : Number(settledAmount) * exchangeRate);

    let remainingAmountCurrency = 0;
    let paymentAmountCurrency = '';

    if (exchangeRate) {
      remainingAmountCurrency =
        Number(invoice.remainingAmountCurrency) -
        (data.paymentCurrency !== 'IDR'
          ? Number(settledAmount)
          : Number(settledAmount) / exchangeRate);

      paymentAmountCurrency =
        data.paymentCurrency !== 'IDR'
          ? settledAmount
          : (Number(settledAmount) / exchangeRate).toString();
    } else {
      remainingAmountCurrency =
        Number(invoice.remainingAmountCurrency) -
        (data.paymentCurrency !== 'IDR' ? Number(settledAmount) : 0);

      paymentAmountCurrency =
        data.paymentCurrency !== 'IDR' ? settledAmount : Number(0).toString();
    }

    const paymentHistory = this.paymentHistoryRepo.create({
      invoiceNumber: invoice.invoiceNumber,
      paymentDate,
      bank,
      bankHolder,
      paymentAmount:
        data.paymentCurrency === 'IDR'
          ? settledAmount
          : (Number(settledAmount) * exchangeRate).toString(),
      paymentAmountCurrency,
      remainingAmount: remainingAmount.toString(),
      remainingAmountCurrency: remainingAmountCurrency.toString(),
      fileContainer,
      fileName,
      originalName: upload.file.originalname,
      url: `${process.env.URL_S3}/${fileContainer}/${fileName}`,
      paymentStatus: PaymentHistoryPaymentStatus.CONFIRMED,
      createdByUserId: user.userId,
      paidCurrency: data.paymentCurrency,
    });

    invoice = await this.setSettlePaid(
      totalPaidAmount,
      settledAmount,
      invoice,
      user,
      data.paymentCurrency,
      exchangeRate,
    );

    return await this.connection.transaction(async (entityManager) => {
      if (!bankEntity) {
        const newBankEntity = this.bankRepo.create({
          name: bank,
          createdByUserId: user.userId,
          companyId: user.companyId,
        });
        await entityManager.save(newBankEntity);
      }

      await entityManager.save(paymentHistory);

      return await entityManager.save(invoice);
    });
  }

  async getTotalPaidAmount(
    invoiceNumber: string,
    settledAmount,
    paymentCurrency,
  ) {
    // get accumalate of amount that already been paid
    // to update invoices.settledAmount
    const { sum: totalPaymentAmount, sumCurrency: totalPaymentAmountCurrency } =
      await this.paymentHistoryRepo
        .createQueryBuilder('ph')
        .where(
          `ph.invoiceNumber = :invoiceNumber
      AND ph.status = :status AND ph.paymentStatus != :paymentStatus
      AND ph.paymentStatus != :paymentStatus`,
          {
            invoiceNumber,
            status: 1,
            paymentStatus: PaymentHistoryPaymentStatus.REJECTED,
          },
        )
        .select([
          'SUM(ph.paymentAmount) AS sum',
          'SUM(ph.paymentAmountCurrency) AS sumCurrency',
        ])
        .getRawOne();

    let totalPaid = 0;

    if (paymentCurrency === 'IDR') {
      totalPaid = totalPaymentAmount
        ? +totalPaymentAmount + +settledAmount
        : +settledAmount;
    } else {
      totalPaid = totalPaymentAmountCurrency
        ? +totalPaymentAmountCurrency + +settledAmount
        : +settledAmount;
    }

    return totalPaid;
  }

  setSettlePaid(
    totalPaid,
    settledAmount,
    invoice: Invoice,
    user: CurrentUserDto,
    paymentCurrency: string,
    exchangeRate: number,
  ) {
    let settledAmountCurrency = 0;
    let remainingAmountCurrency = 0;
    // partially paid
    if (paymentCurrency === 'IDR') {
      if (Number(settledAmount) < Number(invoice.remainingAmount)) {
        if (exchangeRate > 0) {
          settledAmountCurrency = totalPaid / exchangeRate;
          remainingAmountCurrency =
            Number(invoice.remainingAmountCurrency) - (settledAmount ? Number(settledAmount) / exchangeRate : 0);
        } else {
          settledAmountCurrency = 0;
          remainingAmountCurrency = Number(invoice.remainingAmountCurrency) - 0;
        }
        Object.assign(invoice, {
          invoiceProcess: InvoiceProcess.PARTIALLY_PAID,
          updatedByUserId: user.userId,
          settledAmount: totalPaid,
          settledAmountCurrency,
          remainingAmount:
            Number(invoice.remainingAmount) - Number(settledAmount),
          remainingAmountCurrency,
          paidCurrency: invoice.paidCurrency
            ? invoice.paidCurrency
            : paymentCurrency,
        });
      } else if (Number(settledAmount) === Number(invoice.remainingAmount)) {
        Object.assign(invoice, {
          invoiceStatus: InvoiceStatus.SETTLED,
          invoiceProcess: InvoiceProcess.PAID,
          settledDate: format(new Date(), 'yyyy-MM-dd'),
          settledAmount: totalPaid,
          settledAmountCurrency,
          remainingAmount: 0,
          remainingAmountCurrency: 0,
          updatedByUserId: user.userId,
          paidCurrency: invoice.paidCurrency
            ? invoice.paidCurrency
            : paymentCurrency,
        });
      }
    } else {
      if (Number(settledAmount) < Number(invoice.remainingAmountCurrency)) {
        Object.assign(invoice, {
          invoiceProcess: InvoiceProcess.PARTIALLY_PAID,
          updatedByUserId: user.userId,
          settledAmount: totalPaid * exchangeRate,
          settledAmountCurrency: totalPaid,
          remainingAmount:
            Number(invoice.remainingAmount) -
            Number(settledAmount) * exchangeRate,
          remainingAmountCurrency:
            Number(invoice.remainingAmountCurrency) - Number(settledAmount),
          paidCurrency: invoice.paidCurrency
            ? invoice.paidCurrency
            : paymentCurrency,
        });
      } else if (
        Number(settledAmount) === Number(invoice.remainingAmountCurrency)
      ) {
        Object.assign(invoice, {
          invoiceStatus: InvoiceStatus.SETTLED,
          invoiceProcess: InvoiceProcess.PAID,
          settledDate: format(new Date(), 'yyyy-MM-dd'),
          settledAmount: totalPaid * exchangeRate,
          settledAmountCurrency: totalPaid,
          remainingAmount: 0,
          remainingAmountCurrency: 0,
          updatedByUserId: user.userId,
          paidCurrency: invoice.paidCurrency
            ? invoice.paidCurrency
            : paymentCurrency,
        });
      }
    }

    return invoice;
  }

  async getDetail(
    invoiceNumber: string,
    invoiceStatus: InvoiceStatus,
    user: CurrentUserDto,
  ) {
    try {
      const invoice = await this.invoiceRepo
        .createQueryBuilder('i')
        .leftJoinAndSelect('i.customer', 'c')
        .leftJoin('c.user', 'uc')
        .leftJoinAndSelect('i.shipment', 's','s.status = :status')
        .leftJoinAndSelect('i.quotation', 'q', `q.status = :status AND ${!user.isTrial ? `q.companyId = :companyId` : `(q.companyId = :companyId OR q.affiliation =:dummyAffiliation)`}`)
        .leftJoinAndSelect(
          'i.invoicePrices',
          'ip',
          'ip.status = :status AND ip.invoiceHistoryId is NULL',
        )
        .leftJoin('i.paymentHistories', 'ph', 'ph.status = :status')
        .leftJoin('i.rejectLogs', 'rj')
        .leftJoin('i.thirdParties', 'tp')
        .leftJoin('i.invoiceHistories', 'ih', 'ih.status = :status')
        .leftJoin('ih.customer', 'ihcs', 'ihcs.status = :status')
        .leftJoin('i.receivableHistories', 'irh','irh.status = :status')
        .leftJoin('i.receivablePayments', 'irp','irp.status = :status')
        .leftJoin('irh.creator', 'irhc')
        .leftJoin('ih.thirdParties', 'ihtp')
        .leftJoin('ih.creator', 'ihc')
        .leftJoin('ih.approvedBy', 'iha')
        .leftJoin('ih.invoicePrices', 'ihp')
        .where(
          `
          i.invoiceNumber = :invoiceNumber
          AND i.invoiceStatus = :invoiceStatus
          AND i.status = :status
        `,
        )
        .select([
          'i.invoiceNumber',
          'i.jobSheetNumber',
          'i.referenceNumber',
          'i.invoiceStatus',
          'i.invoiceProcess',
          'i.invoiceLabel',
          'i.customerId',
          'i.arStatus',
          'i.total',
          'i.totalCurrency',
          'i.invoiceDate',
          'i.createdAt',
          'i.dueDate',
          'i.settledAmount',
          'i.settledAmountCurrency',
          'i.remainingAmount',
          'i.remainingAmountCurrency',
          'i.ppn',
          'i.defaultPpn',
          'i.currency',
          'i.exchangeRate',
          'i.totalCurrency',
          'i.paidCurrency',
          'i.thirdPartyId',
          'q.shipmentVia',
          'q.rfqNumber',
          'q.shipmentType',
          'q.shipmentService',
          'q.countryFrom',
          'q.cityFrom',
          'q.addressFrom',
          'q.countryTo',
          'q.cityTo',
          'q.addressTo',
          's.rfqNumber',
          'ip',
          'c.companyName',
          'c.typeOfPayment',
          'c.email',
          'uc.customerId',
          'uc.fullName',
          'uc.photo',
          'ph.id',
          'ph.paymentDate',
          'ph.bank',
          'ph.bankHolder',
          'ph.paymentAmount',
          'ph.paymentAmountCurrency',
          'ph.paidCurrency',
          'ph.originalName',
          'ph.url',
          'ph.paymentStatus',
          'rj.rejectDate',
          'rj.invoiceDate',
          'rj.reason',
          'tp',
          'ih',
          'ihcs.id',
          'ihcs.customerId',
          'ihcs.fullName',
          'ihcs.companyName',
          'ihcs.email',
          'ihtp.companyName',
          'ihtp.email',
          'ihc.fullName',
          'iha.fullName',
          'ihp',
          'irh.action',
          'irh.details',
          'irh.createdAt',
          'irhc.fullName',
          'irp.id',
          'irp.currency',
          'irp.amountPaid',
          'irp.amountPaidCurrency',
          'irp.amountRemaining',
          'irp.amountRemainingCurrency',
          'irp.paymentDate',
          'irp.bankAccount',
          'irp.bankHolder',
          'irp.url',
          'irp.originalName',
        ])
        .setParameters({
          invoiceNumber,
          invoiceStatus,
          status: 1,
          companyId: user.companyId,
          type: ShipmentSellingPriceType.INVOICE,
          dummyAffiliation: 'DUMMY',
        })
        .orderBy('ip.id', 'ASC')
        .addOrderBy('ph.paymentDate', 'ASC')
        .addOrderBy('ih.createdAt', 'ASC')
        .addOrderBy('irh.createdAt', 'DESC')
        .getOne();

      if (!invoice || (invoice.rfqNumber && !invoice.quotation)) {
        throw new NotFoundException('Invoice not found');
      }

      // thirdParty or customer check
      if (invoice.thirdParties) {
        invoice['recipient'] = 'Third Party';
        invoice['thirdPartyCompanyName'] = invoice.thirdParties.companyName;
        invoice['thirdPartyEmail'] = invoice.thirdParties.email;
        invoice['typeOfPayment'] = invoice.thirdParties.typeOfPayment;
      } else {
        invoice['recipient'] = 'Customer';
        invoice['typeOfPayment'] = invoice.customer.typeOfPayment;
      }
      delete invoice.thirdParties;

      invoice['overdue'] =
        this.helper.checkOverDueInvoice(invoice.dueDate) &&
        invoice.invoiceStatus == InvoiceStatus.ISSUED;

      // make ppn and defaultPpn inside shipment
      if(invoice.shipment){
        invoice.shipment['ppn'] = invoice.ppn;
        invoice.shipment['defaultPpn'] = invoice.defaultPpn;
      }

      if(invoice.quotation){
        const tempInvoiceSequence = await this.invoicePriceRepo
          .createQueryBuilder('ip')
          .select([
            `row_number() over(partition by ip.rfqNumber ORDER BY ip.createdAt) as RC`,
            'ip.rfqNumber as rfqNumber',
            'ip.invoiceNumber as invoiceNumber',
          ])
          .where(`ip.rfqNumber IN (:rfqNumber)`, {
            rfqNumber: invoice.quotation.rfqNumber,
          })
          .groupBy('ip.invoiceNumber')
          .orderBy('ip.createdAt')
          .getRawMany();

        let maxSequence = tempInvoiceSequence.filter(
          (el) => el.rfqNumber === invoice.quotation.rfqNumber,
        ).length;

        let sequence = tempInvoiceSequence.find(
          (el) => el.invoiceNumber === invoiceNumber,
        );

        let rowCount = sequence ? sequence.RC : null;

        invoice['invoiceSequence'] = rowCount
          ? `${rowCount} of ${maxSequence} invoices`
          : null;
      }else{
        invoice['invoiceSequence'] = null;
      }

      invoice['subtotal'] = invoice.invoicePrices.reduce(
        (acc, el) => acc + +el.subtotal,
        0,
      );
      invoice['totalVat'] = invoice.invoicePrices.reduce(
        (acc, el) => acc + (el.subtotal * el.ppn) / 100,
        0,
      );

      if (invoice.paidCurrency && invoice.paidCurrency !== 'IDR') {
        invoice.remainingAmount = invoice.remainingAmountCurrency;
      }

      invoice.paymentHistories.forEach((paymentHistory) => {
        if (paymentHistory.paidCurrency !== 'IDR') {
          paymentHistory.paymentAmount = paymentHistory.paymentAmountCurrency;
        }
      });

      invoice['detailChanges'] = null;

      if (invoice.invoiceLabel == InvoiceLabel.NEED_APPROVAL) {
        invoice.invoiceHistories.map((item) => {
          if (
            item.statusApproval == InvoiceHistoryStatusApproval.NEED_APPROVAL
          ) {
            invoice['detailChanges'] = item;

            item['invoiceStatus'] = invoice.invoiceStatus;
            item['invoiceNumber'] = item.invoiceNumberCurrent;

            if (item.thirdParties) {
              item['recipient'] = 'Third Party';
              item['thirdPartyCompanyName'] = item.thirdParties.companyName;
              item['thirdPartyEmail'] = item.thirdParties.email;
            } else {
              item['recipient'] = 'Customer';
            }
            delete item.thirdParties;

            item['subtotal'] = item.invoicePrices.reduce(
              (acc, el) => acc + +el.subtotal,
              0,
            );
            item['totalVat'] = item.invoicePrices.reduce(
              (acc, el) => acc + (el.subtotal * el.ppn) / 100,
              0,
            );

            invoice['detailChanges']['changesField'] =
              this.helper.compareDifferentValue({ ...invoice }, { ...item }, [
                'id',
                'status',
                'subTotal',
                'statusApproval',
                'invoicePrices',
                'createdAt',
                'updatedAt',
                'createdByUserId',
                'approvedByUserId',
                'recipient',
                'thirdPartyCompanyName',
                'thirdPartyEmail',
                'creator',
                'customer',
                'approvedBy',
                'invoiceNumberCurrent',
              ]);

            if(item['recipient'] !== invoice['recipient']) invoice['detailChanges']['changesField'].push('recipient')

            item.invoicePrices.map((itemPrice, key) => {
              itemPrice['isNew'] = false;
              if (!invoice.invoicePrices[key]) {
                itemPrice['isNew'] = true;
              }

              itemPrice['changesField'] = this.helper.compareDifferentValue(
                invoice.invoicePrices ? { ...invoice.invoicePrices[key] } : {},
                { ...itemPrice },
                [
                  'id',
                  'isNew',
                  'createdAt',
                  'updatedAt',
                  'invoiceHistoryId',
                  'note',
                  'createdByUserId',
                  'updatedByUserId',
                ],
              );
            });
          }
        });
      }

      return invoice;
    } catch (error) {
      throw error;
    }
  }

  async getPreview(invoiceNumber: string, user: CurrentUserDto) {
    try {
      let whereStatement = `
        i.invoiceNumber = :invoiceNumber
      `;

      const invoice = await this.invoiceRepo
        .createQueryBuilder('i')
        .innerJoin(
          'i.invoicePrices',
          'ip',
          'ip.status = :status AND ip.invoiceHistoryId is NULL',
        )
        .leftJoin(
          'i.paymentHistories',
          'ph',
          'ph.paymentStatus = :paymentStatus',
        )
        .leftJoin('i.quotation', 'q', `q.status = :status AND ${!user.isTrial ? `q.companyId = :companyId` : `(q.companyId = :companyId OR q.affiliation =:dummyAffiliation)`}`)
        .leftJoin('i.shipment', 's')
        .leftJoin('s.shipmentOtifs', 'so', 'so.otifStatus = :otifStatus', {
          otifStatus: OtifStatus.DEPARTURE,
        })
        .leftJoin('i.customer', 'cust')
        .leftJoin('cust.notificationSettingDisabled', 'nsd')
        .leftJoin('cust.company', 'comp')
        .leftJoin('comp.paymentAdvices', 'pa', 'pa.status = :status')
        .leftJoin('i.thirdParties', 'tp')
        .leftJoin('tp.company', 'tpcomp')
        .leftJoin('i.jobSheet', 'j')
        .leftJoin('j.jobSheetShipment', 'js')
        .leftJoin('i.receivablePayments', 'irp','irp.status = :status')
        .where(`
            i.invoiceNumber = :invoiceNumber
            AND i.status = :status
        `)
        .select([
          'i.invoiceNumber',
          'i.referenceNumber',
          'i.invoiceStatus',
          'i.invoiceProcess',
          'i.invoiceLabel',
          'i.total',
          'i.totalCurrency',
          'i.invoiceDate',
          'i.dueDate',
          'i.remainingAmount',
          'i.remainingAmountCurrency',
          'i.settledAmount',
          'i.currency',
          'i.currencyUnit',
          'i.exchangeRate',
          'i.paidCurrency',
          'ip.priceComponent',
          'ip.uom',
          'ip.price',
          'ip.subtotalCurrency',
          'ip.totalCurrency',
          'ip.convertedPrice',
          'ip.qty',
          'ip.subtotal',
          'ip.subtotalCurrency',
          'ip.ppn',
          'ip.total',
          'ip.totalCurrency',
          'ph.paymentAmount',
          'ph.paymentAmountCurrency',
          'ph.paymentDate',
          'ph.paidCurrency',
          'q.consigneeCompany',
          'q.shipperCompany',
          'q.cityFrom',
          'q.cityTo',
          'q.kindOfGoods',
          'q.shipmentVia',
          'q.countryFromCode',
          'q.countryToCode',
          'q.cityFrom',
          'q.cityTo',
          's.rfqNumber',
          's.masterBl',
          's.houseBl',
          'so.shippingNumber',
          'cust.companyName',
          'cust.fullName',
          'cust.email',
          'cust.address',
          'cust.npwp',
          'comp.name',
          'comp.logo',
          'comp.address',
          'comp.email',
          'comp.phoneCode',
          'comp.phoneNumber',
          'comp.invoiceRemark',
          'pa.currencyName',
          'pa.bankName',
          'pa.accNumber',
          'pa.accHolder',
          'pa.paymentInstructions',
          'nsd',
          'tp',
          'tpcomp.name',
          'tpcomp.logo',
          'tpcomp.address',
          'tpcomp.email',
          'tpcomp.phoneCode',
          'tpcomp.phoneNumber',
          'tpcomp.invoiceRemark',
          'j.jobSheetNumber',
          'js.cityFrom',
          'js.cityTo',
          'irp.id',
          'irp.currency',
          'irp.amountPaid',
          'irp.amountPaidCurrency',
          'irp.amountRemaining',
          'irp.amountRemainingCurrency',
          'irp.paymentDate',
          'irp.bankAccount',
          'irp.bankHolder',
          'irp.url',
          'irp.originalName',
        ])
        .setParameters({
          invoiceNumber,
          status: 1,
          companyId: user.companyId,
          paymentStatus: PaymentHistoryPaymentStatus.CONFIRMED,
        })
        .orderBy('ph.paymentDate', 'ASC')
        .addOrderBy('ip.id', 'ASC')
        .getOne();

      if (!invoice || (invoice.rfqNumber && !invoice.quotation)) {
        throw new NotFoundException('Invoice not found');
      }

      if (
        invoice.invoiceStatus == InvoiceStatus.ISSUED &&
        Number(invoice.settledAmount) > 0
      ) {
        invoice.invoiceProcess = InvoiceProcess.PARTIALLY_PAID;
      }

      if(invoice.customer){
        invoice['company'] = invoice.customer.company;
        delete invoice.customer.company;
      }else if(invoice.thirdParties){
        invoice['company'] = invoice.thirdParties.company;
        delete invoice.thirdParties.company;
      }

      if(invoice.shipment){
        invoice['shipment'] = Object.assign({}, invoice.shipment, {
          shippingNumber:
            invoice.shipment.shipmentOtifs?.[0]?.shippingNumber ?? '-',
        });
        delete invoice.shipment.shipmentOtifs;
      }

      invoice['overdue'] =
        this.helper.checkOverDueInvoice(invoice.dueDate) &&
        invoice.invoiceStatus == InvoiceStatus.ISSUED;

      invoice['totalWordEn'] = this.helper
        .numberToWordsEn(invoice.total)
        .concat(' Rupiah');

      invoice['totalWordId'] = this.helper
        .numberToWordsId(invoice.total)
        .concat(' Rupiah');

      invoice['totalCurrencyWordEn'] = this.helper
        .numberToWordsEn(invoice.totalCurrency)
        .concat(` ${invoice.currencyUnit}`);

      invoice['totalCurrencyWordId'] = this.helper
        .numberToWordsId(invoice.totalCurrency)
        .concat(` ${invoice.currencyUnit}`);

      invoice['subtotal'] = invoice.invoicePrices.reduce(
        (acc, el) => acc + +el.subtotal,
        0,
      );
      invoice['totalVat'] = invoice.invoicePrices.reduce(
        (acc, el) => acc + (el.subtotal * el.ppn) / 100,
        0,
      );

      if(invoice.quotation){
        const origin = await this.originDestinationService.getCityCode(
          user.companyId,
          invoice.quotation.cityFrom,
          user.isTrial,
        );
        const destination = await this.originDestinationService.getCityCode(
          user.companyId,
          invoice.quotation.cityTo,
          user.isTrial,
        );
        Object.assign(invoice, {
          origin: origin.cityCode,
          destination: destination.cityCode,
        });
      }else{
        Object.assign(invoice, {
          origin: '-',
          destination: '-',
        });
      }

      if (invoice.paidCurrency && invoice.paidCurrency !== 'IDR') {
        invoice.remainingAmount = invoice.remainingAmountCurrency;
      }

      invoice.paymentHistories.forEach((paymentHistory) => {
        if (paymentHistory.paidCurrency !== 'IDR') {
          paymentHistory.paymentAmount = paymentHistory.paymentAmountCurrency;
        }
      });

      // replace payment history with receivable payments
      if(invoice.receivablePayments){
        delete invoice.paymentHistories;
        const paymentHistories = [];
        invoice.receivablePayments.forEach((item) => {
          if (item.currency !== 'IDR') {
            item.amountPaid = item.amountPaidCurrency;
          }

          paymentHistories.push({
            paymentDate: item.paymentDate,
            paymentAmount: item.amountPaid,
            paymentAmountCurrency : item.amountPaidCurrency,
            paidCurrency: item.currency,
          });
        });
        invoice.paymentHistories = paymentHistories;
      }

      return invoice as any;
    } catch (error) {
      throw error;
    }
  }

  async getList(
    invoiceStatus: InvoiceStatus,
    invoiceProcess: InvoiceProcess,
    invoiceLabel: InvoiceLabel,
    tempStatus: TemporaryProformaStatus,
    tempActiveFinish: string,
    page: number,
    perpage: number,
    filter: string,
    date: string,
    dueDate: string,
    shipmentVia: ShipmentVia,
    shipmentType: ShipmentType,
    origin: string,
    destination: string,
    user: CurrentUserDto,
  ) {
    try {
      const limit = perpage;
      const offset = perpage * (page - 1);
      let query: any;

      if (invoiceStatus == InvoiceStatus.TEMPORARY) {
        query = this.shipmentRepo
          .createQueryBuilder('s')
          .innerJoinAndSelect('s.customer', 'c')
          .innerJoin('s.quotation', 'q')
          .leftJoin('s.shipmentOtifs', 'so', 'so.otifStatus = s.otifStatus')
          .innerJoin('s.shipmentSellingPrice', 'ssp')
          .leftJoin('s.invoices', 'i')
          .where(
            `
            ${
              !user.isTrial
                ? `q.companyId = :companyId`
                : `(q.companyId = :companyId OR q.affiliation = :dummyAffiliation)`
            }
            AND s.status = :status
            AND q.status = :status
            AND ssp.status = :status
            AND NOT ssp.type = :sspType
          `,
          )
          .setParameters({
            status: 1,
            companyId: user.companyId,
            sspType: ShipmentSellingPriceType.SHIPMENT,
            dummyAffiliation: 'DUMMY',
          })
          .select([
            's.rfqNumber',
            'q.shipmentVia',
            'q.shipmentType',
            'q.shipmentService',
            'q.countryFrom',
            'q.cityFrom',
            'q.countryTo',
            'q.cityTo',
            'c.companyName',
            'ssp.type',
            'ssp.createdAt',
          ])
          .orderBy('ssp.createdAt', 'DESC');

        if (date) {
          const from = date.split('to')[0];
          const until = date.split('to')[1];
          query.andWhere(
            `(DATE(ssp.createdAt) >= :from AND DATE(ssp.createdAt) <= :until)`,
            { from, until },
          );
        }
      } else {
        query = this.invoiceRepo
          .createQueryBuilder('i')
          .innerJoinAndSelect('i.customer', 'c')
          .innerJoin('i.shipment', 's')
          .leftJoin('s.shipmentOtifs', 'so', 'so.otifStatus = s.otifStatus')
          .innerJoin('i.quotation', 'q')
          .where(
            `
            i.invoiceStatus = :invoiceStatus
            AND ${
              !user.isTrial
                ? `q.companyId = :companyId`
                : `(q.companyId = :companyId OR q.affiliation = :dummyAffiliation)`
            }
            AND i.status = :status
            AND s.status = :status
            AND q.status = :status
          `,
          )
          .setParameters({
            invoiceStatus,
            status: 1,
            companyId: user.companyId,
            dummyAffiliation: 'DUMMY',
          })
          .select([
            'i.invoiceStatus',
            'i.invoiceProcess',
            'i.invoiceLabel',
            'i.invoiceNumber',
            'i.referenceNumber',
            'i.rfqNumber',
            'i.createdAt',
            'i.total',
            'i.thirdPartyId',
            'q.shipmentVia',
            'q.shipmentType',
            'q.shipmentService',
            'q.countryFrom',
            'q.cityFrom',
            'q.countryTo',
            'q.cityTo',
            'c.companyName',
          ]);

        if (date) {
          const from = date.split('to')[0];
          const until = date.split('to')[1];
          query.andWhere(
            `(DATE(i.createdAt) >= :from AND DATE(i.createdAt) <= :until)`,
            { from, until },
          );
        }
        if (
          [InvoiceStatus.ISSUED, InvoiceStatus.SETTLED].includes(invoiceStatus)
        ) {
          query.addSelect(['i.dueDate']);

          if (dueDate) {
            const fromDueDate = dueDate.split('to')[0];
            const untilDueDate = dueDate.split('to')[1];
            query.andWhere(
              `(DATE(i.dueDate) >= :fromDueDate AND DATE(i.dueDate) <= :untilDueDate)`,
              { fromDueDate, untilDueDate },
            );
          }
        }
        if (invoiceProcess) {
          query = query.andWhere(`(i.invoiceProcess IN (:invoiceProcess))`, {
            invoiceProcess,
          });
        }
        if (invoiceLabel) {
          query = query.andWhere(`(i.invoiceLabel IN (:invoiceLabel))`, {
            invoiceLabel,
          });
        }
      }

      if (filter) {
        query.andWhere(
          `(
            q.rfqNumber like :filter
            OR i.invoiceNumber like :filter
            OR c.companyName like :filter
            OR q.countryFrom like :filter
            OR q.countryTo like :filter
            OR q.cityFrom like :filter
            OR q.cityTo like :filter
            OR q.shipmentType like :filter
            OR q.packingList like :filter
            OR s.houseBl like :filter
            OR so.houseAwb like :filter
            OR i.referenceNumber like :filter
          )`,
          { filter: `%${filter}%` },
        );
      }

      if (shipmentType) {
        if (shipmentType.includes('SEAFCL')) {
          query.andWhere(`(q.packingList like :shipmentType)`, {
            shipmentType: `%${shipmentType}%`,
          });
        } else {
          query.andWhere(`(q.shipmentType IN (:shipmentType))`, {
            shipmentType,
          });
        }
      }

      if (shipmentVia) {
        query.andWhere(`(q.shipmentVia IN (:shipmentVia))`, {
          shipmentVia,
        });
      }

      if (origin) {
        query.andWhere(`(q.cityFrom = :origin)`, { origin });
      }

      if (destination) {
        query.andWhere(`(q.cityTo = :destination)`, { destination });
      }

      if (invoiceStatus != InvoiceStatus.TEMPORARY) {
        query.orderBy('i.needApproval', 'DESC');
        query.addOrderBy('i.createdAt', 'DESC');
      }

      let allData = await query.getMany();
      let totalRecord = allData.length;

      let data = await query.limit(limit).offset(offset).getMany();

      if (invoiceStatus === InvoiceStatus.ISSUED) {
        data.forEach((el) => {
          el['overdue'] = this.helper.checkOverDueInvoice(el.dueDate);
        });
      }

      if (invoiceStatus !== InvoiceStatus.TEMPORARY) {
        let mappedRfqNumber = data[0]?.rfqNumber
          ? data.map((el) => el.rfqNumber)
          : [null];

        const tempInvoiceSequence = await this.invoicePriceRepo
          .createQueryBuilder('ip')
          .select([
            `row_number() over(partition by ip.rfqNumber ORDER BY ip.createdAt) as RC`,
            'ip.rfqNumber as rfqNumber',
            'ip.invoiceNumber as invoiceNumber',
          ])
          .where(`ip.rfqNumber IN (:...rfqNumber)`, {
            rfqNumber: mappedRfqNumber,
          })
          .groupBy('ip.invoiceNumber')
          .orderBy('ip.createdAt')
          .getRawMany();

        data.forEach(async (el) => {
          let maxSequence = tempInvoiceSequence.filter(
            (el2) => el2.rfqNumber === el.rfqNumber,
          ).length;

          let sequence = tempInvoiceSequence.find(
            (el2) => el2.invoiceNumber === el.invoiceNumber,
          );

          let rowCount = sequence ? sequence.RC : null;

          el['invoiceSequence'] = rowCount
            ? `${rowCount} of ${maxSequence} invoices`
            : null;

          if (el.thirdPartyId) {
            el['recipient'] = 'THIRD_PARTY';
          } else {
            el['recipient'] = 'CUSTOMER';
          }
          delete el.thirdPartyId;
        });
      }

      let totalShowed = data.length;

      // Temporary Invoice Data
      if (invoiceStatus == InvoiceStatus.TEMPORARY) {
        allData.forEach((element) => {
          let temporaryProformaStatus = TemporaryProformaStatus.PROGRESS;

          if (
            element['shipmentSellingPrice'].every(
              (el) => el.type === ShipmentSellingPriceType.TEMP_INVOICE,
            )
          ) {
            temporaryProformaStatus = TemporaryProformaStatus.DRAFT;
          }

          if (
            element['shipmentSellingPrice'].every(
              (el) => el.type !== ShipmentSellingPriceType.TEMP_INVOICE,
            )
          ) {
            temporaryProformaStatus = TemporaryProformaStatus.CREATED;
          }

          element['temporaryProformaStatus'] = temporaryProformaStatus;
          element['createdAt'] = element['shipmentSellingPrice'][0].createdAt;
          delete element['shipmentSellingPrice'];
        });

        if (tempActiveFinish == TempActiveFinish.ACTIVE) {
          allData = allData.filter(
            (el) =>
              el.temporaryProformaStatus == TemporaryProformaStatus.PROGRESS ||
              el.temporaryProformaStatus == TemporaryProformaStatus.DRAFT,
          );
        }

        if (tempActiveFinish == TempActiveFinish.FINISH) {
          allData = allData.filter(
            (el) =>
              el.temporaryProformaStatus == TemporaryProformaStatus.CREATED,
          );
        }

        if (tempStatus) {
          allData = allData.filter(
            (el) => el.temporaryProformaStatus == tempStatus,
          );
        }

        totalRecord = allData.length;
        data = allData.slice(offset).slice(0, limit);
        totalShowed = data.length;
      }

      return {
        page,
        totalRecord,
        totalShowed,
        totalPage: Math.ceil(totalRecord / limit),
        showing: `${totalRecord === 0 ? 0 : offset + 1} - ${
          offset + totalShowed
        } of ${totalRecord}`,
        next: offset + totalShowed !== totalRecord,
        data,
      };
    } catch (error) {
      throw error;
    }
  }

  async issueInvoice(
    invoiceNumber: string,
    body: UpdateIssuedInvoiceDto,
    user: CurrentUserDto,
  ) {
    try {
      const invoice = await this.invoiceRepo
        .createQueryBuilder('i')
        .innerJoinAndSelect('i.customer', 'c')
        .innerJoinAndSelect('i.shipment', 's')
        .innerJoinAndSelect('i.quotation', 'q')
        .innerJoinAndSelect(
          'i.invoicePrices',
          'ip',
          'ip.status = :status AND ip.invoiceHistoryId is NULL',
        )
        .leftJoinAndSelect('i.thirdParties', 'tp')
        .where(
          `
          i.invoiceNumber = :invoiceNumber
          AND i.status = :status
          AND q.companyId = :companyId
          AND s.status = :status
          AND q.status = :status
        `,
        )
        .setParameters({
          invoiceNumber,
          status: 1,
          companyId: user.companyId,
        })
        .orderBy('ip.id', 'ASC')
        .getOne();

      if (!invoice) {
        throw new BadRequestException('Invoice not found');
      }
      if (invoice.invoiceStatus === InvoiceStatus.SETTLED) {
        throw new BadRequestException(
          'Only allows update as invoice is not settled',
        );
      }
      delete invoice.invoicePrices;
      return await this.connection.transaction(async (entityManager) => {
        if (invoice.invoiceStatus === InvoiceStatus.PROFORMA) {
          invoice.invoiceStatus = InvoiceStatus.ISSUED;
          invoice.invoiceProcess = InvoiceProcess.PENDING;
        }

        invoice.invoiceDate = format(new Date(body.invoiceDate), 'yyyy-MM-dd');
        invoice.dueDate =
          invoice.customer.typeOfPayment &&
          invoice.customer.typeOfPayment != TypeOfPayment.CASH
            ? format(
                new Date(
                  addDays(
                    new Date(body.invoiceDate),
                    TypeOfPaymentDay[invoice.customer.typeOfPayment],
                  ),
                ),
                'yyyy-MM-dd',
              )
            : null;
        invoice.issuedDate = format(new Date(), 'yyyy-MM-dd');
        invoice.issuedBy = user.userId;
        invoice.remainingAmount = invoice.total.toString();
        invoice.remainingAmountCurrency = invoice.totalCurrency.toString();

        const result = await entityManager.save(invoice);
        this.sendIssuedInvoice(
          user,
          invoiceNumber,
          invoice.invoiceDate,
          invoice.dueDate,
        );

        return result;
      });
    } catch (error) {
      throw error;
    }
  }

  async updateInvoice(
    invoiceNumber: string,
    body: UpdateInvoiceDto,
    user: CurrentUserDto,
  ) {
    try {
      const {
        ppn,
        defaultPpn,
        exchangeRate,
        sellingPrices,
        thirdPartyId,
        currency,
        referenceNumber,
      } = body;

      const invoice = await this.invoiceRepo
        .createQueryBuilder('i')
        .innerJoinAndSelect('i.customer', 'c')
        .innerJoinAndSelect('i.shipment', 's')
        .innerJoinAndSelect('i.quotation', 'q')
        .innerJoinAndSelect(
          'i.invoicePrices',
          'ip',
          'ip.status = :status AND ip.invoiceHistoryId is NULL',
        )
        .where(
          `
          i.invoiceNumber = :invoiceNumber
          AND i.status = :status
          AND q.companyId = :companyId
          AND s.status = :status
          AND q.status = :status
        `,
        )
        .setParameters({
          invoiceNumber,
          status: 1,
          companyId: user.companyId,
        })
        .orderBy('ip.id', 'ASC')
        .getOne();

      if (!invoice) {
        throw new BadRequestException('Invoice not found');
      }
      if (invoice.invoiceStatus != InvoiceStatus.PROFORMA) {
        throw new BadRequestException(
          'Only allows update as invoice is proforma',
        );
      }

      if (thirdPartyId) {
        if (invoice.invoiceProcess !== InvoiceProcess.PROFORMA_READY) {
          throw new BadRequestException(
            'Only allows update recipient as invoice is proforma ready',
          );
        }
      }

      let tpId = null;

      if (thirdPartyId || thirdPartyId === 0) {
        tpId = thirdPartyId === 0 ? null : thirdPartyId;
      } else {
        tpId = invoice.thirdPartyId;
      }

      const isIdr = invoice.currency === 'IDR';

      Object.assign(invoice, {
        sellingPrices: [...invoice.invoicePrices],
      });

      delete invoice.invoicePrices;

      let total = 0;
      let totalCurrency = 0;

      const sellingPricesValue = [];
      sellingPrices.forEach((el) => {
        const convertedPrice = el.price * exchangeRate;
        const subtotal = currency === 'IDR' ? el.price * el.qty : convertedPrice * el.qty;
        const subtotalCurrency = el.price * el.qty;
        const ppn = body.defaultPpn ? body.ppn : el.ppn;
        const obj = Object.assign(el, {
          rfqNumber: invoice.rfqNumber,
          invoiceNumber,
          convertedPrice: currency === 'IDR' ? el.price : convertedPrice,
          subtotal,
          subtotalCurrency,
          ppn,
          totalCurrency: subtotalCurrency,
          total: subtotal + (el.ppn / 100) * subtotal,
          createdByUserId: user.userId,
        });

        sellingPricesValue.push(obj);

        total += obj.total;
        totalCurrency += obj.totalCurrency;
      });

      return await this.connection.transaction(async (entityManager) => {
        // update Invoice Price //
        await entityManager
          .createQueryBuilder()
          .update(InvoicePrice)
          .set({ status: 0, updatedByUserId: user.userId })
          .where(
            `
            invoiceNumber = :invoiceNumber
            AND status = :status
          `,
          )
          .setParameters({
            invoiceNumber,
            status: 1,
          })
          .execute();

        const newSellingPrices =
          this.invoicePriceRepo.create(sellingPricesValue);
        await entityManager.save(newSellingPrices);

        Object.assign(invoice, {
          ppn,
          defaultPpn,
          thirdPartyId: tpId,
          currency,
          referenceNumber,
          exchangeRate: isIdr ? 1 : exchangeRate,
          total,
          totalCurrency,
          remainingAmount: total.toString(),
          remainingAmountCurrency: totalCurrency.toString(),
        });

        invoice.exchangeRate = currency === 'IDR' ? 1 : Number(exchangeRate);
        const result = await entityManager.save(invoice);

        delete result.customer;
        delete result.quotation;
        delete result.shipment;

        return result;
      });
    } catch (error) {
      throw error;
    }
  }

  async resendInvoice(invoiceNumber: string, user: CurrentUserDto) {
    try {
      const invoice = await this.invoiceRepo
        .createQueryBuilder('i')
        .innerJoin('i.customer', 'c')
        .leftJoin('c.user', 'u', 'u.userStatus = :userStatus', {
          userStatus: 'USERVERIFICATION',
        })
        .innerJoin('i.quotation', 'q')
        .addSelect(['q.countryFrom', 'q.countryTo', 'c.id', 'u.customerLogin'])
        .where(
          `
          i.invoiceNumber = :invoiceNumber
          AND i.invoiceProcess = '${InvoiceProcess.NEED_REVISION}'
          AND i.status = :status
          AND q.companyId = :companyId
        `,
        )
        .setParameters({
          invoiceNumber,
          status: 1,
          companyId: user.companyId,
        })
        .getOne();

      if (!invoice) {
        throw new BadRequestException('Invoice not found');
      }

      return await this.connection.transaction(async (entityManager) => {
        invoice.invoiceProcess = InvoiceProcess.WAITING_APPROVAL;
        invoice.createdAt = new Date();

        const result = await entityManager.save(invoice);

        await this.sendProformaInvoice(user, invoiceNumber);

        if (user.customerModule && invoice.customer.user?.customerLogin) {
          await this.notificationsService.create({
            customerId: invoice.customerId,
            type: NotificationType.INVOICE,
            invoiceNumber,
            invoiceStatus: InvoiceStatus.PROFORMA,
            countryFrom: invoice.quotation.countryFrom,
            countryTo: invoice.quotation.countryTo,
            actionStatus: NotificationActionStatus.PROFORMA_INVOICE_ISSUED,
            isRead: false,
            createdAt: new Date(),
            createdBy: user.userId,
          });
        }

        delete result.customer;
        delete result.quotation;

        return result;
      });
    } catch (error) {
      throw error;
    }
  }

  async updatePaymentHistoryStatus(
    paymentHistoryId: number,
    body: UpdatePaymentHistoryStatusDto,
    user: CurrentUserDto,
  ) {
    try {
      let paymentHistory = await this.paymentHistoryRepo
        .createQueryBuilder('ph')
        .innerJoinAndSelect('ph.invoice', 'i')
        .innerJoin('i.quotation', 'q')
        .innerJoin('i.customer', 'c')
        .leftJoin('c.user', 'u', 'u.userStatus = :userStatus', {
          userStatus: 'USERVERIFICATION',
        })
        .where(
          `
          ph.id = :paymentHistoryId
          AND ph.paymentStatus = :paymentStatus
          AND i.status = :status
          AND q.companyId = :companyId
          AND ph.status = :status
        `,
        )
        .setParameters({
          paymentHistoryId,
          paymentStatus: PaymentHistoryPaymentStatus.WAITING_CONFIRMATION,
          status: 1,
          affiliation: user.affiliation,
          companyId: user.companyId,
        })
        .addSelect(['q.countryFrom', 'q.countryTo', 'c.id', 'u.customerLogin'])
        .getOne();

      if (!paymentHistory) {
        throw new BadRequestException('Payment History not found');
      }

      const exchangeRate = paymentHistory.invoice.exchangeRate;

      return await this.connection.transaction(async (entityManager) => {
        let isRejected = false;
        const notificationBody = {};

        if (body.paymentStatus === PaymentHistoryPaymentStatus.CONFIRMED) {
          const totalPaidAmount = await this.getTotalPaidAmount(
            paymentHistory.invoiceNumber,
            0,
            paymentHistory.paidCurrency,
          );
          paymentHistory.invoice = await this.setSettlePaid(
            totalPaidAmount,
            paymentHistory.paidCurrency === 'IDR'
              ? paymentHistory.paymentAmount
              : paymentHistory.paymentAmountCurrency,
            paymentHistory.invoice,
            user,
            paymentHistory.paidCurrency,
            exchangeRate,
          );


        } else if (
          body.paymentStatus === PaymentHistoryPaymentStatus.REJECTED
        ) {

          if (paymentHistory.paidCurrency === 'IDR') {
            paymentHistory.invoice.invoiceProcess = Number(paymentHistory.invoice.settledAmount) > 0
              ? InvoiceProcess.PARTIALLY_PAID
              : InvoiceProcess.PENDING;
          } else {
            paymentHistory.invoice.invoiceProcess = Number(paymentHistory.invoice.settledAmountCurrency) > 0
              ? InvoiceProcess.PARTIALLY_PAID
              : InvoiceProcess.PENDING;
          }

          paymentHistory.rejectReason = body.rejectReason;

          isRejected = true;
          Object.assign(notificationBody, {
            customerId: paymentHistory.invoice.customerId,
            type: NotificationType.INVOICE,
            invoiceNumber: paymentHistory.invoiceNumber,
            invoiceStatus: paymentHistory.invoice.invoiceStatus,
            countryFrom: paymentHistory.invoice.quotation.countryFrom,
            countryTo: paymentHistory.invoice.quotation.countryTo,
            actionStatus: NotificationActionStatus.INVOICE_PAYMENT_REJECTED,
            isRead: false,
            createdAt: new Date(),
            createdBy: user.userId,
          });
        }
        paymentHistory.paymentStatus = body.paymentStatus;

        delete paymentHistory.invoice.quotation;
        await entityManager.save(paymentHistory.invoice);

        const result = await entityManager.save(paymentHistory);

        this.sendPaymentStatusUpdate(
          user,
          paymentHistory.invoice.invoiceNumber,
          paymentHistory.paymentAmount,
          body.paymentStatus,
        );

        if (
          isRejected &&
          user.customerModule &&
          paymentHistory.invoice.customer.user?.customerLogin
        ) {
          this.notificationsService.create(notificationBody);
        }

        return result;
      });
    } catch (error) {
      throw error;
    }
  }

  async updateIssuedInvoice(
    invoiceNumber: string,
    body: UpdateIssuedInvoiceDto,
    user: CurrentUserDto,
  ) {
    const invoice = await this.invoiceRepo
      .createQueryBuilder('i')
      .innerJoinAndSelect('i.customer', 'c')
      .innerJoinAndSelect('i.shipment', 's')
      .innerJoinAndSelect('i.quotation', 'q')
      .innerJoinAndSelect(
        'i.invoicePrices',
        'ip',
        'ip.status = :status AND ip.invoiceHistoryId is NULL',
      )
      .where(
        `
          i.invoiceNumber = :invoiceNumber
          AND i.status = :status
          AND q.companyId = :companyId
          AND s.status = :status
          AND q.status = :status
        `,
      )
      .setParameters({
        invoiceNumber,
        status: 1,
        companyId: user.companyId,
      })
      .orderBy('ip.id', 'ASC')
      .getOne();

    if (!invoice) {
      throw new BadRequestException('Invoice not found');
    }
    if (invoice.invoiceStatus !== InvoiceStatus.ISSUED) {
      throw new BadRequestException('Only allows update as invoice is issued');
    }

    invoice.invoiceDate = format(new Date(body.invoiceDate), 'yyyy-MM-dd');
    invoice.dueDate =
      invoice.customer.typeOfPayment &&
      invoice.customer.typeOfPayment != TypeOfPayment.CASH
        ? format(
            new Date(
              addDays(
                new Date(body.invoiceDate),
                TypeOfPaymentDay[invoice.customer.typeOfPayment],
              ),
            ),
            'yyyy-MM-dd',
          )
        : null;

    delete invoice.invoicePrices;
    return await this.invoiceRepo.save(invoice);
  }

  async sendProformaInvoice(
    user: CurrentUserDto,
    invoiceNumber: string,
    thirdParty: boolean = false,
    invoiceProcess: InvoiceProcess = undefined,
    email: string = undefined,
  ) {
    const data = await this.getPreview(invoiceNumber, user);

    if (
      data.customer.notificationSettingDisabled.find(
        (item) => item.name == 'INVOICE_PROFORMA_APPROVAL',
      )
    )
      return;

    const pdf = await this.pdfService.createInvoice(data);

    const payload = {
      ffName: data.company.name,
      ffLogo: data.company.logo,
      ffEmail: data.company.email,
      ffAddress: data.company.address,
      ffPhoneCode: data.company.phoneCode,
      ffPhoneNumber: data.company.phoneNumber,
      customerName: thirdParty
        ? data.thirdParties.companyName
        : data.customer.companyName,
      customerEmail: thirdParty ? data.thirdParties.email : data.customer.email,
      invoiceProcess: invoiceProcess
        ? invoiceProcess.split('_').join(' ').toLowerCase()
        : data.invoiceProcess.split('_').join(' ').toLowerCase(),
      origin: data.origin,
      destination: data.destination,
      rfqNumber: data.shipment.rfqNumber,
      shipmentVia: data.quotation.shipmentVia,
      cityFrom: data.quotation.cityFrom,
      cityTo: data.quotation.cityTo,
      invoiceNumber,
    };

    payload['invoiceUrl'] =
      process.env.NODE_ENV === 'production'
        ? `https://${user.customerSubdomain}.customer.syncargo.com`
        : `https://${user.customerSubdomain}.syncargo.com`;

    payload['invoiceUrl'] +=
      '/invoice-management/details/' +
      data.invoiceStatus +
      '?invoice=' +
      invoiceNumber;

    this.mailService.sendPromofaInvoice(
      email ? email : payload.customerEmail,
      pdf,
      payload,
      thirdParty,
    );
  }

  async sendIssuedInvoice(
    user: CurrentUserDto,
    invoiceNumber: string,
    invoiceDate: any,
    dueDate: any,
    customEmail = null,
  ) {
    const data = await this.getPreview(invoiceNumber, user);

    data.invoiceDate = invoiceDate;
    data.dueDate = dueDate;

    const dueDateDays = data.dueDate
      ? ` (${differenceInDays(new Date(data.dueDate), new Date())} Days Left)`
      : null;

    const pdf = await this.pdfService.createInvoice(data);

    // SEND WA Notif
    /*const hashedFileName = `${crypto.randomBytes(10).toString('hex')}`;
    const upload = { type: 'Invoice', hashedFileName, buffer: pdf };
    const url = await this.s3Service.uploadPDF(upload);
    const phone = `${data.customer.phoneCode}${data.customer.phoneNumber}`;
    const message = `Dear Customer,\n\nYour Invoice for the shipment details as below is ready.\n\nRFQ Number: ${data.shipment.rfqNumber} \nOrigin City: ${data.quotation.cityFrom} \nDestination City: ${data.quotation.cityTo} \nShipment Service: ${data.quotation.shipmentService} \n\nYou can download your invoice by clicking this link below \n\n${url}\n\nBest Regards, \nSyncargo `;

    this.whatsappService.send(phone, message);*/

    if (
      data.customer.notificationSettingDisabled.find(
        (item) => item.name == 'INVOICE_WAITING_PAYMENT',
      )
    )
      return;

    // SEND EMAIL Notif

    const payload = {
      ffName: data.company.name,
      ffLogo: data.company.logo,
      ffEmail: data.company.email,
      ffAddress: data.company.address,
      ffPhoneCode: data.company.phoneCode,
      ffPhoneNumber: data.company.phoneNumber,
      customerName: data.thirdParties
        ? data.thirdParties.companyName
        : data.customer.companyName,
      origin: data.origin ? data.origin : null,
      destination: data.destination ? data.destination : null,
      invoiceNumber,
      invoiceDate: data.invoiceDate,
      dueDate: data.dueDate + (dueDateDays ? dueDateDays : ''),
      remainingAmount: data.remainingAmount,
      remainingAmountCurrency: data.remainingAmountCurrency,
      currency: data.currency,
      customer: data.thirdParties ? false : true,
    };

    payload['invoiceUrl'] =
      process.env.NODE_ENV === 'production'
        ? `https://${user.customerSubdomain}.customer.syncargo.com`
        : `https://${user.customerSubdomain}.syncargo.com`;

    payload['invoiceUrl'] +=
      '/invoice-management/details/' +
      data.invoiceStatus +
      '?invoice=' +
      invoiceNumber;
    this.mailService.sendIssuedInvoice(
      customEmail ? customEmail : (data.thirdParties ? data.thirdParties.email : data.customer.email),
      pdf,
      payload,
      customEmail ? true : false
    );
  }

  async getInvoicePrices(rfqNumber: String) {
    const invoice = await this.invoiceRepo
      .createQueryBuilder('i')
      .innerJoin(
        'i.invoicePrices',
        'ip',
        'ip.status = :status AND ip.invoiceHistoryId is NULL',
      )
      .leftJoin('i.thirdParties', 'tp')
      .select([
        'i.invoiceNumber',
        'tp.companyName',
        'tp.email',
        'i.invoiceStatus',
        'i.total',
        'i.totalCurrency',
        'i.createdAt',
        'i.defaultPpn',
        'i.ppn',
        'i.currency',
        'i.exchangeRate',
        'ip.priceComponent',
        'ip.uom',
        'ip.price',
        'ip.convertedPrice',
        'ip.qty',
        'ip.subtotal',
        'ip.subtotalCurrency',
        'ip.ppn',
        'ip.total',
        'ip.totalCurrency',
        'ip.note',
      ])
      .where(
        `
        ip.rfqNumber = :rfqNumber
      `,
      )
      .setParameters({
        rfqNumber,
        status: 1,
      })
      .orderBy('ip.id', 'ASC')
      .getMany();

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // thirdParty or customer check
    invoice.forEach((item) => {
      if (item.thirdParties) {
        Object.assign(item, {
          recipient: 'Third Party',
          thirdPartyCompanyName: item.thirdParties.companyName,
          thirdPartyEmail: item.thirdParties.email,
        });
      } else {
        Object.assign(item, {
          recipient: 'Customer',
        });
      }
      delete item.thirdParties;
    });

    return invoice;
  }

  async getDetailTemporary(user: CurrentUserDto, rfqNumber: string) {
    try {
      const quotation = await this.quotationRepo
        .createQueryBuilder('q')
        .innerJoin('q.customer', 'c')
        .select([
          'q.shipmentVia AS shipmentVia',
          'q.rfqNumber AS rfqNumber',
          'q.shipmentType AS shipmentType',
          'q.shipmentService AS shipmentService',
          'q.countryFrom AS countryFrom',
          'q.cityFrom AS cityFrom',
          'q.addressFrom AS addressFrom',
          'q.countryTo AS countryTo',
          'q.cityTo AS cityTo',
          'q.addressTo AS addressTo',
          'q.customerId AS customerId',
          'c.companyName AS companyName',
        ])
        .where(
          `
          q.rfqNumber = :rfqNumber
          AND q.status = :status
          AND ${
            !user.isTrial
              ? `q.companyId = :companyId`
              : `(q.companyId = :companyId OR q.affiliation = :dummyAffiliation)`
          }
        `,
        )
        .setParameters({
          rfqNumber,
          companyId: user.companyId,
          status: 1,
          dummyAffiliation: 'DUMMY',
        })
        .getRawOne();

      if (!quotation) {
        throw new NotFoundException('Quotation not found');
      }

      const sellingPrice = await this.shipmentSellingPriceRepo
        .createQueryBuilder('ssp')
        .select(['ssp.type'])
        .where(`ssp.rfqNumber = :rfqNumber AND ssp.status = :status`, {
          rfqNumber,
          status: 1,
        })
        .orderBy('id', 'ASC')
        .groupBy('ssp.type')
        .addGroupBy('ssp.status')
        .getMany();

      // draft : temp_invoice
      // progress : temp_invoice, invoice
      // created : invoice [, closed_invoice]
      let temporaryProformaStatus = TemporaryProformaStatus.PROGRESS;

      if (
        sellingPrice.every(
          (el) => el.type === ShipmentSellingPriceType.TEMP_INVOICE,
        )
      ) {
        temporaryProformaStatus = TemporaryProformaStatus.DRAFT;
      }

      if (
        sellingPrice.every(
          (el) => el.type !== ShipmentSellingPriceType.TEMP_INVOICE,
        )
      ) {
        temporaryProformaStatus = TemporaryProformaStatus.CREATED;
      }

      const { createdAt } = await this.shipmentSellingPriceRepo.findOne({
        select: ['createdAt'],
        where: {
          rfqNumber,
          type: In([
            ShipmentSellingPriceType.TEMP_INVOICE,
            ShipmentSellingPriceType.INVOICE,
            ShipmentSellingPriceType.CLOSED_INVOICE,
          ]),
        },
        order: { id: 'ASC' },
      });
      const header = Object.assign(
        { temporaryProformaStatus, createdAt },
        quotation,
      );
      delete header.customerId;

      const temporaryInvoicePrices =
        await this.shipmentSellingPricesService.getAll(rfqNumber, true);
      const createdInvoices = await this.getInvoicePrices(rfqNumber);
      createdInvoices.forEach((el) => {
        el['subtotal'] = el.invoicePrices.reduce(
          (acc, el) => acc + +el.subtotal,
          0,
        );
        el['totalVat'] = el.invoicePrices.reduce(
          (acc, el) => acc + (el.subtotal * el.ppn) / 100,
          0,
        );
      });

      return {
        customerId: quotation.customerId,
        header,
        temporaryInvoicePrices,
        createdInvoices,
      };
    } catch (error) {
      throw error;
    }
  }

  async sendPaymentStatusUpdate(
    user: CurrentUserDto,
    invoiceNumber: string,
    totalAmount: string,
    paymentStatus: string,
  ) {
    const data = await this.getPreview(invoiceNumber, user);
    if (
      data.customer.notificationSettingDisabled.find(
        (item) => item.name == 'INVOICE_PROOF_PAYMENT_STATUS',
      )
    )
      return;

    const payload = {
      ffName: data.company.name,
      ffLogo: data.company.logo,
      ffEmail: data.company.email,
      ffAddress: data.company.address,
      ffPhoneCode: data.company.phoneCode,
      ffPhoneNumber: data.company.phoneNumber,
      customerName: data.customer.companyName,
      origin: data.origin,
      destination: data.destination,
      invoiceNumber,
      invoiceDate: data.invoiceDate
        ? new Date(data.invoiceDate).toLocaleString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        : '-',
      dueDate: data.dueDate
        ? new Date(data.dueDate).toLocaleString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        : '-',
      totalAmount: parseFloat(totalAmount).toLocaleString('id'),
      paymentStatus: {
        text:
          paymentStatus == PaymentHistoryPaymentStatus.CONFIRMED
            ? 'confirmed'
            : 'rejected',
        value:
          paymentStatus == PaymentHistoryPaymentStatus.CONFIRMED
            ? 'Paid'
            : 'Rejected',
        label:
          paymentStatus == PaymentHistoryPaymentStatus.CONFIRMED
            ? 'success'
            : 'error',
      },
    };

    payload['invoiceUrl'] =
      process.env.NODE_ENV === 'production'
        ? `https://${user.customerSubdomain}.customer.syncargo.com`
        : `https://${user.customerSubdomain}.syncargo.com`;

    payload['invoiceUrl'] +=
      '/invoice-management/details/' +
      data.invoiceStatus +
      '?invoice=' +
      invoiceNumber;

    this.mailService.sendPaymentStatusUpdate(data.customer.email, payload);
  }
}
