import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, Not, Repository } from 'typeorm';
import { InvoiceHistory } from '../../entities/invoice-history.entity';
import { Invoice } from '../../entities/invoice.entity';
import { InvoicePrice } from '../../entities/invoice-price.entity';
import { EditInvoiceDto } from './dto/edit-invoice.dto';
import { CurrentUserDto } from '../auth/dtos/current-user.dto';
import {
  InvoiceHistoryStatusApproval,
  InvoiceLabel,
  InvoiceProcess,
  InvoiceStatus,
  JobSheetReceivableHistoryAction, JobSheetReceivableHistoryActionLabel,
  JobSheetReceivableStatus,
  NotificationActionStatus,
  NotificationType,
  Role,
  TypeOfPayment,
  TypeOfPaymentDay,
} from '../../enums/enum';
import { ApprovalEditInvoiceDto } from './dto/approval-edit-invoice.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { User } from 'src/entities/user.entity';
import { MailService } from 'src/mail/mail.service';
import { addDays, format } from 'date-fns';
import { JobSheetReceivableHistoryService } from '../jobsheet-receivable-history/jobsheet-receivable-history.service';
import { JobSheet } from '../../entities/job-sheet.entity';
import { JobSheetService } from '../jobsheets/jobsheets.service';
import { ThirdParty } from '../../entities/third-party.entity';
import { Customer } from '../../entities/customer.entity';

@Injectable()
export class InvoiceHistoryService {
  constructor(
    @InjectRepository(InvoiceHistory) private invoiceHistoryRepo: Repository<InvoiceHistory>,
    @InjectRepository(Invoice) private invoiceRepo: Repository<Invoice>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(InvoicePrice) private invoicePriceRepo: Repository<InvoicePrice>,
    @InjectRepository(JobSheet) private jobSheetRepo: Repository<JobSheet>,
    @InjectRepository(ThirdParty) private thirdPartyRepo: Repository<ThirdParty>,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    private notificationsService: NotificationsService,
    private mailService: MailService,
    private connection: Connection,
    private jobSheetService: JobSheetService,
    private jobSheetReceivableHistoryService: JobSheetReceivableHistoryService,
  ) {}

  async editInvoice(
    invoiceNumber: string,
    body: EditInvoiceDto,
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
        .leftJoinAndSelect('i.shipment', 's')
        .leftJoinAndSelect('i.quotation', 'q')
        .where(
          `
          i.invoiceNumber = :invoiceNumber
          AND (
              (
                i.invoiceStatus = :invoiceStatus
                AND i.invoiceProcess = :invoiceProcess
                AND q.companyId = :companyId
              )
              OR
              (
                i.arStatus is NOT NULL
                AND i.arStatus NOT IN (:arStatus)
              )
          )
          AND (i.invoiceLabel != :invoiceLabel OR i.invoiceLabel IS NULL)
          AND i.status = :status
        `,
        )
        .setParameters({
          invoiceNumber,
          invoiceStatus: InvoiceStatus.ISSUED,
          invoiceProcess: InvoiceProcess.PENDING,
          invoiceLabel: InvoiceLabel.NEED_APPROVAL,
          arStatus: [JobSheetReceivableStatus.PAID,JobSheetReceivableStatus.PARTIALLY_PAID],
          status: 1,
          companyId: user.companyId,
        })
        .getOne();

      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }

      if(invoice.arStatus){
        if(await this.invoiceRepo.findOne({
          where:{
            invoiceNumber,
            id: Not(invoice.id)
          }
        })) throw new BadRequestException( 'Invoice number already used!',);
      }

      let tpId = null;
      let typeOfPayment = invoice?.customer?.typeOfPayment;

      if (thirdPartyId || thirdPartyId === 0) {
        tpId = thirdPartyId === 0 ? null : thirdPartyId;
      } else {
        tpId = thirdPartyId;
      }

      if(tpId){
        const thirdParty = await this.thirdPartyRepo.findOne({ id: thirdPartyId});

        if(!thirdParty) throw new BadRequestException( 'Third party is not found!',);
        typeOfPayment = thirdParty.typeOfPayment;
      }else{
        const customer = await this.customerRepo.findOne({ customerId : body.customerId, status:1 });
        if(!customer) throw new BadRequestException( 'Customer is not found!',);
        typeOfPayment = customer.typeOfPayment;
      }

      const isIdr = currency === 'IDR';

      let total = 0;
      let subTotalInvoice = 0;
      let totalCurrency = 0;

      const sellingPricesValue = [];
      sellingPrices.forEach((el) => {
        const convertedPrice = el.price * exchangeRate;
        const subtotal =
          currency === 'IDR' ? el.price * el.qty : convertedPrice * el.qty;
        const subtotalCurrency = el.price * el.qty;
        const ppn = body.defaultPpn ? body.ppn : el.ppn;
        const obj = Object.assign(el, {
          rfqNumber: invoice.rfqNumber,
          invoiceNumber: body.invoiceNumber,
          convertedPrice: currency === 'IDR' ? el.price : convertedPrice,
          subtotal,
          subtotalCurrency,
          ppn,
          totalCurrency: subtotalCurrency,
          total: subtotal + (el.ppn / 100) * subtotal,
          createdByUserId: user.userId,
        });

        sellingPricesValue.push(obj);

        subTotalInvoice += subtotal;
        total += obj.total;
        totalCurrency += obj.totalCurrency;
      });

      if(invoice.jobSheetNumber){

        const jobSheet = await this.jobSheetRepo
          .createQueryBuilder('j')
          .leftJoin('j.customer', 'c')
          .select(['j','c'])
          .where(`
        j.jobSheetNumber = :jobSheetNumber
        AND j.companyId = :companyId
        AND j.status = :status
      `,{jobSheetNumber:invoice.jobSheetNumber, companyId : user.companyId, status: 1})
          .getOne();

        if(!jobSheet) throw new BadRequestException(
          'Job Sheet  not found!',
        );


        const dueDate =
          typeOfPayment &&
          typeOfPayment != TypeOfPayment.CASH
            ? format(
            new Date(
              addDays(
                new Date(body.invoiceDate),
                TypeOfPaymentDay[typeOfPayment],
              ),
            ),
            'yyyy-MM-dd',
            )
            : null;

        Object.assign(body,{dueDate});
      }

      const newInvoiceHistory = this.invoiceHistoryRepo.create({
        ...body,
      });

      Object.assign(newInvoiceHistory, {
        invoiceNumber,
        invoiceNumberCurrent: body.invoiceNumber,
        ppn,
        defaultPpn,
        subTotal: subTotalInvoice,
        thirdPartyId: tpId,
        currency,
        referenceNumber,
        exchangeRate: isIdr ? 1 : exchangeRate,
        total,
        totalCurrency,
        statusApproval: InvoiceHistoryStatusApproval.NEED_APPROVAL,
        remainingAmount: total.toString(),
        remainingAmountCurrency: totalCurrency.toString(),
        createdByUserId: user.userId,
      });

      const savedInvoiceHistory = await this.connection.transaction(
        async (entityManager) => {
          newInvoiceHistory.exchangeRate = currency === 'IDR' ? 1 : Number(exchangeRate);
          const invoiceHistory = await entityManager.save(newInvoiceHistory);

          sellingPricesValue.map((item, index) => {
            sellingPricesValue[index]['invoiceHistoryId'] = invoiceHistory.id;
          });

          const newSellingPrices =
            this.invoicePriceRepo.create(sellingPricesValue);
          await entityManager.save(newSellingPrices);

          if(invoice.arStatus){
            invoice.arStatus = JobSheetReceivableStatus.WAITING_APPROVAL;

            // insert receivable history
            await this.jobSheetReceivableHistoryService.submit(user.userId,invoice.id,{
              action: JobSheetReceivableHistoryAction.EDITED,
              details: JobSheetReceivableHistoryActionLabel[JobSheetReceivableHistoryAction.EDITED]
            })

            // update job sheet ar status
            await this.jobSheetService.updateArStatus(invoice.jobSheetNumber, user.companyId);

          }

          invoice.invoiceLabel = InvoiceLabel.NEED_APPROVAL;
          invoice.needApproval = 1;

          await entityManager.save(invoice);

          Object.assign(invoiceHistory,{
            invoiceStatus: invoice.invoiceStatus,
          });

          return invoiceHistory;
        },
      );

      return await this.connection.transaction(async (entityManager) => {
        if ([Role.ADMIN,Role.MANAGER].includes(<Role>user.role)) {
          const approvalDto = new ApprovalEditInvoiceDto();
          approvalDto.action = InvoiceHistoryStatusApproval.APPROVED;
          return await this.editApprovalInvoice(
            invoiceNumber,
            approvalDto,
            user,
            true,
          );
        } else {
          this.notificationsService.notifyInternalApproval(
            user,
            NotificationType.INVOICE,
            NotificationActionStatus.INVOICE_EDIT_NEED_APPROVAL,
            {
              invoiceNumber,
              invoiceStatus: invoice.invoiceStatus,
              jobSheetNumber: invoice.jobSheetNumber,
              customerId: invoice.customerId,
              countryFrom: invoice.quotation ? invoice.quotation.countryFrom : null,
              countryTo: invoice.quotation ? invoice.quotation.countryTo : null,
              rfqNumber: invoice.rfqNumber,
              shipmentVia: invoice.quotation ? invoice.quotation.shipmentVia : null,
            },
          );
          this.sendEditInvoiceRequestEmail(invoiceNumber, user);
          return savedInvoiceHistory;
        }
      });
    } catch (error) {
      throw error;
    }
  }

  async editApprovalInvoice(
    invoiceNumber: string,
    body: ApprovalEditInvoiceDto,
    user: CurrentUserDto,
    isManager = false,
  ) {
    try {
      const invoice = await this.invoiceRepo
        .createQueryBuilder('i')
        .leftJoinAndSelect('i.shipment', 's')
        .leftJoinAndSelect('i.quotation', 'q')
        .leftJoinAndSelect('i.jobSheet', 'j')
        .where(
          `
          i.invoiceNumber = :invoiceNumber
          AND (
            (
              i.invoiceStatus = :invoiceStatus
              AND i.invoiceProcess = :invoiceProcess
              AND q.companyId = :companyId
              AND s.status = :status
              AND q.status = :status      
            )
            OR
            (
              i.arStatus IS NOT NULL
              AND i.arStatus = :arStatus
            )
          )
          AND i.invoiceLabel = :invoiceLabel
          AND i.status = :status
        `,
        )
        .setParameters({
          invoiceNumber,
          invoiceStatus: InvoiceStatus.ISSUED,
          invoiceProcess: InvoiceProcess.PENDING,
          invoiceLabel: InvoiceLabel.NEED_APPROVAL,
          arStatus: JobSheetReceivableStatus.WAITING_APPROVAL,
          status: 1,
          companyId: user.companyId,
        })
        .getOne();

      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }

      const invoiceHistory = await this.invoiceHistoryRepo
        .createQueryBuilder('ih')
        .leftJoin('ih.invoicePrices', 'ihp', 'ihp.status = :status')
        .where(
          `
          ih.invoiceNumber = :invoiceNumber
          AND ih.statusApproval = :statusApproval
          AND ih.status = :status
        `,
        )
        .select([
          'ih.id',
          'ih.invoiceNumber',
          'ih.invoiceNumberCurrent',
          'ih.customerId',
          'ih.currency',
          'ih.subTotal',
          'ih.total',
          'ih.totalCurrency',
          'ih.remainingAmount',
          'ih.remainingAmountCurrency',
          'ih.exchangeRate',
          'ih.thirdPartyId',
          'ih.defaultPpn',
          'ih.ppn',
          'ih.referenceNumber',
          'ih.invoiceDate',
          'ih.dueDate',
          'ih.statusApproval',
          'ih.createdByUserId',
          'ihp',
        ])
        .setParameters({
          invoiceNumber,
          statusApproval: InvoiceHistoryStatusApproval.NEED_APPROVAL,
          status: 1,
        })
        .getOne();

      if (!invoiceHistory) {
        throw new NotFoundException('Invoice history not found');
      }

      const newInvoicePrices = [...invoiceHistory.invoicePrices];
      newInvoicePrices.map((item) => {
        delete item.id;
        delete item.invoiceHistoryId;
      });

      const notificationPayload = {
        invoiceNumber,
        invoiceStatus: invoice.invoiceStatus,
        jobSheetNumber: invoice.jobSheetNumber,
        customerId: invoice.customerId,
        countryFrom: invoice.quotation? invoice.quotation.countryFrom : null,
        countryTo: invoice.quotation ? invoice.quotation.countryTo : null,
        rfqNumber: invoice.shipment ? invoice.shipment.rfqNumber : null,
        shipmentVia: invoice.quotation ? invoice.quotation.shipmentVia : null,
      };

      const staffId = invoiceHistory.createdByUserId;

      return await this.connection.transaction(async (entityManager) => {
        invoiceHistory.statusApproval = body.action;
        invoiceHistory.approvedByUserId = user.userId;

        await entityManager
          .createQueryBuilder()
          .update(InvoicePrice)
          .set({ status: 0, updatedByUserId: user.userId })
          .where(
            `
            invoiceHistoryId = :invoiceHistoryId
            AND status = :status
          `,
          )
          .setParameters({
            invoiceHistoryId: invoiceHistory.id,
            status: 1,
          })
          .execute();

        delete invoiceHistory.invoicePrices;
        const savedInvoiceHistory = await entityManager.save(invoiceHistory);

        if (body.action === InvoiceHistoryStatusApproval.APPROVED) {
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

          await entityManager.save(
            this.invoicePriceRepo.create(newInvoicePrices),
          );

          delete invoiceHistory.id;
          delete invoiceHistory.createdByUserId;
          delete invoiceHistory.statusApproval;

          Object.assign(invoice, { ...invoiceHistory });
          invoice.customerId = invoiceHistory.customerId ? invoiceHistory.customerId : invoice.customerId;
          invoice.invoiceLabel = InvoiceLabel.REVISED;
          invoice.invoiceNumber = invoiceHistory.invoiceNumberCurrent ? invoiceHistory.invoiceNumberCurrent : invoiceHistory.invoiceNumber;

          if(invoice.arStatus){
            invoice.arStatus = JobSheetReceivableStatus.APPROVED;
            invoice.invoiceStatus = InvoiceStatus.PROFORMA;
            invoice.invoiceProcess = InvoiceProcess.PROFORMA_READY;
            // insert receivable history
            await this.jobSheetReceivableHistoryService.submit(user.userId,invoice.id,{
              action: JobSheetReceivableHistoryAction.APPROVAL_CHANGES,
              details: JobSheetReceivableHistoryActionLabel[JobSheetReceivableHistoryAction.APPROVAL_CHANGES_APPROVED]
            })
          }

        } else {
          invoice.invoiceLabel = InvoiceLabel.CHANGES_REJECTED;
          if(invoice.arStatus){
            // insert receivable history
            await this.jobSheetReceivableHistoryService.submit(user.userId,invoice.id,{
              action: JobSheetReceivableHistoryAction.APPROVAL_CHANGES,
              details: JobSheetReceivableHistoryActionLabel[JobSheetReceivableHistoryAction.APPROVAL_CHANGES_REJECTED]
            })
          }
        }
        invoice.needApproval = 0;

        await entityManager.save(invoice);

        if(invoice.arStatus) {
          // update job sheet ar status
          await this.jobSheetService.updateArStatus(invoice.jobSheetNumber, user.companyId);
        }

        if (!isManager)
          this.notificationsService.notifyInternalApproval(
            user,
            NotificationType.INVOICE,
            body.action === InvoiceHistoryStatusApproval.APPROVED
              ? NotificationActionStatus.INVOICE_EDIT_APPROVED
              : NotificationActionStatus.INVOICE_EDIT_REJECTED,
            notificationPayload,
            true,
            [staffId],
          );

        Object.assign(savedInvoiceHistory,{
          invoiceStatus: invoice.invoiceStatus,
        });

        return savedInvoiceHistory;
      });
    } catch (error) {
      throw error;
    }
  }

  async sendEditInvoiceRequestEmail(
    invoiceNumber: string,
    user: CurrentUserDto,
  ) {
    const data = (await this.invoiceHistoryRepo
      .createQueryBuilder('ih')
      .leftJoinAndSelect('ih.thirdParty', 'tp')
      .leftJoinAndSelect('ih.invoicePrices', 'ip')
      .leftJoinAndSelect('ih.creator', 'cr')
      .leftJoinAndSelect('cr.company', 'cp')
      .leftJoinAndSelect('ih.invoice', 'i')
      .where(
        `
        ih.invoiceNumber = :invoiceNumber
        AND ih.statusApproval = :statusApproval
        `,
      )
      .setParameters({
        invoiceNumber,
        statusApproval: InvoiceHistoryStatusApproval.NEED_APPROVAL,
      })
      .getOne()) as any;

    const existingInvoicePrices = await this.invoicePriceRepo
      .createQueryBuilder('ip')
      .where(
        `
        ip.invoiceNumber = :invoiceNumber
        AND ip.status = :status
        AND ip.invoiceHistoryId IS NULL
      `,
      )
      .setParameters({
        invoiceNumber,
        status: 1,
      })
      .getMany();

    const adminAndManagerEmails = [];
    const emailsQuery = (await this.userRepo
      .createQueryBuilder('u')
      .where('u.role IN (:...roles)')
      .andWhere('u.companyId = :companyId')
      .setParameters({
        roles: [Role.MANAGER, Role.ADMIN],
        companyId: user.companyId,
      })
      .select('u.email')
      .getMany()) as any;

    emailsQuery.forEach((email) => {
      adminAndManagerEmails.push(email.email);
    });
    const isHeaderInvoiceChanged = !(
      data.currency === data.invoice.currency &&
      data.thirdPartyId === data.invoice.thirdPartyId &&
      data.exchangeRate === data.invoice.exchangeRate &&
      data.referenceNumber === data.invoice.referenceNumber
    );

    const isPriceComponentChanged =
      existingInvoicePrices.length === data.invoicePrices.length
        ? existingInvoicePrices.some((el, i) => {
            return !(
              el.price === data.invoicePrices[i].price &&
              el.convertedPrice === data.invoicePrices[i].convertedPrice &&
              el.subtotal === data.invoicePrices[i].subtotal &&
              el.total === data.invoicePrices[i].total &&
              el.subtotalCurrency === data.invoicePrices[i].subtotalCurrency &&
              el.totalCurrency === data.invoicePrices[i].totalCurrency &&
              el.ppn === data.invoicePrices[i].ppn
            );
          })
        : true;
    const isBothChanged = isHeaderInvoiceChanged && isPriceComponentChanged;

    data.invoicePrices.forEach((el) => {
      el.price = parseFloat(el.price).toLocaleString();
      el.convertedPrice = parseFloat(el.convertedPrice).toLocaleString();
      el.subtotal = parseFloat(el.subtotal).toLocaleString();
      el.total = parseFloat(el.total).toLocaleString();
      el.subtotalCurrency = parseFloat(el.subtotalCurrency).toLocaleString();
      el.totalCurrency = parseFloat(el.totalCurrency).toLocaleString();
      el.isCurrencyIDR = data.currency === 'IDR' ? true : false;
    });

    data['totalVat'] = data.invoicePrices.reduce(
      (acc, el) =>
        acc + (parseFloat(el.subtotal.replace(/,/g, '')) * el.ppn) / 100,
      0,
    );
    const payload = {
      ffName: data.creator.company.name,
      ffLogo: data.creator.company.logo,
      ffEmail: data.creator.company.email,
      ffAddress: data.creator.company.address,
      ffPhoneCode: data.creator.company.phoneCode,
      ffPhoneNumber: data.creator.company.phoneNumber,
      companyName: data.thirdParty ? data.thirdParty.companyName : null,
      invoicePrices: data.invoicePrices,
      invoiceNumber: data.invoiceNumber,
      jobSheetNumber: data.invoice.jobSheetNumber,
      rfqNumber: data.invoice.rfqNumber,
      dueDate: format(new Date(data.invoice.dueDate), 'dd MMMM yyyy'),
      currency: data.currency,
      recipient: data.thirdParty ? 'Third Party' : 'Customer',
      referenceNumber : data.referenceNumber,
      exchangeRate: parseFloat(data.exchangeRate).toLocaleString(),
      subtotal: parseFloat(data.subTotal).toLocaleString(),
      total: parseFloat(data.total).toLocaleString(),
      totalVat: data.totalVat.toLocaleString(),
      totalCurrency: parseFloat(data.totalCurrency).toLocaleString(),
      remainingAmount: parseFloat(data.remainingAmount).toLocaleString(),
      remainingAmountCurrency: parseFloat(
        data.remainingAmountCurrency,
      ).toLocaleString(),
      // if condition for header invoice
      isRecipientCustomer: data.thirdParty ? false : true,
      isCurrencyIDR: data.currency === 'IDR' ? true : false,
      isCurrencyChanged: data.currency !== data.invoice.currency,
      isRecipientChanged: data.thirdPartyId !== data.invoice.thirdPartyId,
      isExchangeRateChanged: data.exchangeRate !== data.invoice.exchangeRate,
      isReferenceNumberChanged: data.referenceNumber !== data.invoice.referenceNumber,
      isHeaderInvoiceChanged,
      isBothChanged,
      // --------------------------------
      isPriceComponentChanged,
      referenceCodeValue: data.invoice.jobSheetNumber ? data.invoice.jobSheetNumber :data.invoice.rfqNumber,
      referenceCodeLabel: data.invoice.jobSheetNumber ? 'Jobsheet Number' : 'RFQ Number',
    };
    this.mailService.sendEditInvoiceRequest(adminAndManagerEmails, payload);
    return {
      message: 'Email has been sent',
    };
  }
}
