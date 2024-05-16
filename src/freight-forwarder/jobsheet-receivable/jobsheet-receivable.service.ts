import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, Not, Repository } from 'typeorm';

import { Helper } from '../helpers/helper';

import { MailService } from 'src/mail/mail.service';
import { JobSheet } from '../../entities/job-sheet.entity';
import { CurrentUserDto } from '../auth/dtos/current-user.dto';
import {
  InvoiceProcess,
  InvoiceStatus, JobSheetPayableStatus,
  JobSheetReceivableHistoryAction,
  JobSheetReceivableHistoryActionLabel,
  JobSheetReceivableStatus,
  NotificationActionStatus,
  NotificationType, PaymentHistoryPaymentStatus,
  Role,
  TypeOfPayment,
  TypeOfPaymentDay,
} from '../../enums/enum';
import { NotificationsService } from '../notifications/notifications.service';
import { S3Service } from '../../s3/s3.service';
import { Customer } from '../../entities/customer.entity';
import { ThirdParty } from '../../entities/third-party.entity';
import { CreateJobSheetReceivableDto } from './dto/create-job-sheet-receivable.dto';
import { InvoicePrice } from '../../entities/invoice-price.entity';
import { Invoice } from '../../entities/invoice.entity';
import { JobSheetService } from '../jobsheets/jobsheets.service';
import { JobSheetReceivableHistoryService } from '../jobsheet-receivable-history/jobsheet-receivable-history.service';
import { addDays, format } from 'date-fns';
import { ApprovalJobSheetReceivableDto } from './dto/approval-job-sheet-receivable.dto';
import { ReviseJobSheetReceivableDto } from './dto/revise-job-sheet-receivable.dto';
import { InvoicesService } from '../invoices/invoices.service';
import * as crypto from "crypto";
import { SubmitPaymentJobSheetReceivableDto } from './dto/submit-payment-job-sheet-receivable.dto';
import { JobSheetReceivablePayment } from '../../entities/job-sheet-receivable-payment.entity';
import { RemittanceJobSheetPayableDto } from '../jobsheet-payables/dto/remittance-job-sheet-payable.dto';
import { RemittanceJobSheetReceivableDto } from './dto/remittance-job-sheet-receivable.dto';
import { Company } from '../../entities/company.entity';

@Injectable()
export class JobsheetReceivableService {
  constructor(
    @InjectRepository(JobSheet) private jobSheetRepo: Repository<JobSheet>,
    @InjectRepository(Company) private companyRepo: Repository<Company>,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    @InjectRepository(ThirdParty) private thirdPartyRepo: Repository<ThirdParty>,
    @InjectRepository(InvoicePrice) private invoicePriceRepo: Repository<InvoicePrice>,
    @InjectRepository(Invoice) private invoiceRepo: Repository<Invoice>,
    @InjectRepository(JobSheetReceivablePayment) private jobSheetReceivablePaymentRepo: Repository<JobSheetReceivablePayment>,
    private mailService: MailService,
    private helper: Helper,
    private connection: Connection,
    private notificationsService: NotificationsService,
    private s3Service: S3Service,
    private jobSheetService: JobSheetService,
    private jobSheetReceivableHistoryService: JobSheetReceivableHistoryService,
    private invoiceService: InvoicesService,
  ) {}

  async create(user: CurrentUserDto, body: CreateJobSheetReceivableDto) {
    const {
      jobSheetNumber,
      customerId,
      defaultPpn,
      ppn,
      exchangeRate,
      sellingPrices,
      thirdPartyId,
      currency,
      referenceNumber,
      invoiceNumber,
      invoiceDate,
    } = body;

    const { userId, companyId } = user;

    if(await this.invoiceRepo.findOne({
      where:{
        invoiceNumber
      }
    })
    ){
      throw new BadRequestException(
        'Invoice Number already used!',
      );
    }

    const { jobSheet, invoicePricesValue,dueDate, total, totalCurrency } = await this.setDataInvoice(body,invoiceNumber,jobSheetNumber,companyId, user);

    const invoicePrices = this.invoicePriceRepo.create(invoicePricesValue);

    const newInvoice = this.invoiceRepo.create({
      jobSheetNumber,
      customerId : customerId ? customerId : jobSheet.customerId,
      invoiceNumber,
      createdByCompanyId: user.companyId,
      createdByUserId: user.userId,
      total,
      totalCurrency,
      thirdPartyId,
      referenceNumber,
      defaultPpn: defaultPpn,
      ppn: ppn,
      currency,
      exchangeRate: exchangeRate,
      remainingAmount: total.toString(),
      remainingAmountCurrency: totalCurrency.toString(),
      invoiceStatus: InvoiceStatus.PROFORMA,
      invoiceProcess: InvoiceProcess.PROFORMA_READY,
      arStatus: JobSheetReceivableStatus.WAITING_APPROVAL,
      invoiceDate,
      dueDate,
    });

    return await this.connection.transaction(async (entityManager) => {

      const jobSheetReceivable = await this.connection.transaction(async (entityManager) => {

        await entityManager.save(invoicePrices);

        const jobSheetReceivable = await entityManager.save(newInvoice);

        // insert receivable history

        jobSheetReceivable.receivableHistories = [
          await this.jobSheetReceivableHistoryService.submit(userId,jobSheetReceivable.id,{
            action: JobSheetReceivableHistoryAction.CREATED,
            details: JobSheetReceivableHistoryActionLabel[JobSheetReceivableHistoryAction.CREATED]
          })
        ];

        // send notification
        this.notificationsService.notifyInternalApproval(user,NotificationType.JOB_SHEET,NotificationActionStatus.JOB_SHEET_RECEIVABLE_WAITING_CONFIRMATION,{jobSheetNumber : jobSheet.jobSheetNumber});

        return jobSheetReceivable;
      });

      // update job sheet ap status
      await this.jobSheetService.updateArStatus(jobSheet.jobSheetNumber, jobSheet.companyId);

      return jobSheetReceivable;
    });
  }

  async approval(user: CurrentUserDto, invoiceNumber: string, body: ApprovalJobSheetReceivableDto) {
    const jobSheetReceivable = await this.invoiceRepo.createQueryBuilder('i')
      .innerJoinAndSelect('i.jobSheet','j')
      .leftJoinAndSelect('i.receivableHistories','ir','ir.status = :status')
      .leftJoin('ir.creator', 'cr')
      .where(`
        i.invoiceNumber = :invoiceNumber
        AND i.arStatus IN (:arStatus)
        AND j.companyId = :companyId
        AND i.status = :status
        AND j.status = :status
      `,{
        status:1,
        companyId: user.companyId,
        invoiceNumber,
        arStatus: [JobSheetReceivableStatus.WAITING_APPROVAL,JobSheetReceivableStatus.APPROVED]
      })
      .getOne();

    if(!jobSheetReceivable) {
      throw new NotFoundException(
        'Data job sheet receivable not found!',
      );
    }

    if(![Role.ADMIN,Role.MANAGER].includes(<Role>user.role)){
      throw new BadRequestException(
        'Approval only for Role Manager!',
      );
    }

    if(body.action == JobSheetReceivableStatus.REJECTED && !body.rejectReason ) {
      throw new BadRequestException(
        'Reject reason is required!',
      );
    }

    if(body.action == JobSheetReceivableStatus.ISSUED ) {
      if(!body.email){
        throw new BadRequestException(
          'Third Party Email is required!',
        );
      }

      if(jobSheetReceivable.arStatus !== JobSheetReceivableStatus.APPROVED){
        throw new BadRequestException(
          'Only issued with Job Sheet receivable Status is Approved!',
        );
      }
    }

    if (jobSheetReceivable.invoiceStatus === InvoiceStatus.SETTLED) {
      throw new BadRequestException(
        'Only allows update as invoice is not settled',
      );
    }

    return await this.connection.transaction(async (entityManager) => {

      const savedJobSheetReceivable = await this.connection.transaction(async (entityManager) => {

        jobSheetReceivable.arStatus = body.action;

        if(body.action == JobSheetReceivableStatus.ISSUED){
            jobSheetReceivable.invoiceStatus = InvoiceStatus.ISSUED;
            jobSheetReceivable.invoiceProcess = InvoiceProcess.PENDING;
            jobSheetReceivable.arStatus = JobSheetReceivableStatus.PENDING;
            jobSheetReceivable.issuedDate = format(new Date(), 'yyyy-MM-dd');
            jobSheetReceivable.issuedBy = user.userId;
        }

        await entityManager.save(jobSheetReceivable);

        // insert receivable history
        jobSheetReceivable.receivableHistories.unshift(await this.jobSheetReceivableHistoryService.submit(user.userId,jobSheetReceivable.id,{
          action: body.action,
          details: body.action != JobSheetReceivableStatus.REJECTED ? JobSheetReceivableHistoryActionLabel[body.action] : JobSheetReceivableHistoryActionLabel[JobSheetReceivableStatus.REJECTED] + body.rejectReason
        }));

        // send notification
        // this.notificationsService.notifyInternalApproval(user,NotificationType.JOB_SHEET,body.action,{ jobSheetNumber : jobSheetReceivable.jobSheet.jobSheetNumber}, true, [jobSheetReceivable.createdByUserId]);

        return jobSheetReceivable;
      });

      // update job sheet ar status
      await this.jobSheetService.updateArStatus(savedJobSheetReceivable.jobSheet.jobSheetNumber, savedJobSheetReceivable.jobSheet.companyId);

      if(body.action == JobSheetReceivableStatus.ISSUED){
        this.invoiceService.sendIssuedInvoice(
          user,
          invoiceNumber,
          jobSheetReceivable.invoiceDate,
          jobSheetReceivable.dueDate,
          body.email,
        );
      }

      return savedJobSheetReceivable;
    });
  }

  async revise(user: CurrentUserDto, body: ReviseJobSheetReceivableDto, invoiceNumber: string) {
    const {
      customerId,
      defaultPpn,
      ppn,
      exchangeRate,
      sellingPrices,
      thirdPartyId,
      currency,
      referenceNumber,
      invoiceDate,
    } = body;

    const { userId, companyId } = user;

    const invoice = await this.invoiceRepo.findOne({
      where:{
        invoiceNumber,
        arStatus: JobSheetReceivableStatus.REJECTED
      }
    });

    if(!invoice) throw new BadRequestException( 'Invoice not found!',);

    if(await this.invoiceRepo.findOne({
      where:{
        invoiceNumber,
        id: Not(invoice.id)
      }
    })) throw new BadRequestException( 'Invoice number already used!',);

    const { jobSheet, invoicePricesValue,dueDate, total, totalCurrency } = await this.setDataInvoice(body,invoiceNumber,invoice.jobSheetNumber,companyId, user);

    Object.assign(invoice,{
      customerId : customerId ? customerId : jobSheet.customerId,
      invoiceNumber: body.invoiceNumber,
      updatedByUserId: user.userId,
      total,
      totalCurrency,
      thirdPartyId,
      referenceNumber,
      defaultPpn: defaultPpn,
      ppn: ppn,
      currency,
      exchangeRate: exchangeRate,
      remainingAmount: total.toString(),
      remainingAmountCurrency: totalCurrency.toString(),
      invoiceStatus: InvoiceStatus.PROFORMA,
      invoiceProcess: InvoiceProcess.PROFORMA_READY,
      arStatus: JobSheetReceivableStatus.WAITING_APPROVAL,
      invoiceDate,
      dueDate,
    });

    const invoicePrices = this.invoicePriceRepo.create(invoicePricesValue);

    return await this.connection.transaction(async (entityManager) => {

      const jobSheetReceivable = await this.connection.transaction(async (entityManager) => {

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

        await entityManager.save(invoicePrices);

        const jobSheetReceivable = await entityManager.save(invoice);

        Object.assign(jobSheetReceivable,{
          invoiceNumberCurrent: body.invoiceNumber
        });

        // insert receivable history

        jobSheetReceivable.receivableHistories = [
          await this.jobSheetReceivableHistoryService.submit(userId,jobSheetReceivable.id,{
            action: JobSheetReceivableHistoryAction.REVISION,
            details: JobSheetReceivableHistoryActionLabel[JobSheetReceivableHistoryAction.REVISION]
          })
        ];

        // send notification
        this.notificationsService.notifyInternalApproval(user,NotificationType.JOB_SHEET,NotificationActionStatus.JOB_SHEET_RECEIVABLE_WAITING_CONFIRMATION,{jobSheetNumber : jobSheet.jobSheetNumber});

        return jobSheetReceivable;
      });

      // update job sheet ap status
      await this.jobSheetService.updateArStatus(jobSheet.jobSheetNumber, jobSheet.companyId);

      return jobSheetReceivable;
    });
  }

  async setDataInvoice(body:any, invoiceNumber, jobSheetNumber, companyId, user){
    const jobSheet = await this.jobSheetRepo
      .createQueryBuilder('j')
      .leftJoin('j.customer', 'c')
      .select(['j','c'])
      .where(`
        j.jobSheetNumber = :jobSheetNumber
        AND j.companyId = :companyId
        AND j.status = :status
      `,{jobSheetNumber, companyId, status: 1})
      .getOne();

    if(!jobSheet) throw new BadRequestException(
      'Job Sheet  not found!',
    );

    let typeOfPayment = null;

    if(body.customerId){
      const customer = await this.customerRepo.findOne({
        where:{
          customerId:body.customerId,
          companyId
        }
      });
      if(!customer){
        throw new BadRequestException(
          'Customer not found!',
        );
      }
      typeOfPayment = customer.typeOfPayment;
    }

    if(body.thirdPartyId){
      const thirdParty = await this.thirdPartyRepo.findOne({
        where:{
          id:body.thirdPartyId,
          company: { id: user.companyId },
        }
      });
      if(!thirdParty){
        throw new BadRequestException(
          'Third Party not found!',
        );
      }
      typeOfPayment = thirdParty.typeOfPayment;
    }

    const isIdr = body.currency === 'IDR';

    let total = 0;
    let totalCurrency = 0;

    const invoicePricesValue = [];

    if (body.sellingPrices?.length) {
      body.sellingPrices.forEach((el) => {
        const convertedPrice = Math.floor(el.price * body.exchangeRate);
        const subtotal = isIdr ? el.price * el.qty : convertedPrice * el.qty;
        const subtotalCurrency = Math.round(el.price * el.qty);
        const ppn = body.defaultPpn ? body.ppn : el.ppn;
        const obj = Object.assign(el, {
          invoiceNumber: body.invoiceNumber,
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
      });
    }

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

    return {
      jobSheet,
      dueDate,
      sellingPrices: body.sellingPrices,
      invoicePricesValue,
      total,
      totalCurrency
    }
  }

  async payment(user: CurrentUserDto, invoiceNumber : string, body: SubmitPaymentJobSheetReceivableDto, file : Express.Multer.File) {
    const { userId, companyId } = user;
    const { paymentDate, amountPaid, bankHolder, bankAccount } = body;

    const jobSheetReceivable = await this.invoiceRepo.createQueryBuilder('i')
      .innerJoinAndSelect('i.jobSheet','j')
      .where(`
        i.invoiceNumber = :invoiceNumber
        AND i.arStatus IN (:arStatus)
        AND j.companyId = :companyId
        AND i.status = :status
        AND j.status = :status
      `,{
        status:1,
        companyId: user.companyId,
        invoiceNumber,
        arStatus: [JobSheetReceivableStatus.PENDING,JobSheetReceivableStatus.PARTIALLY_PAID]
      })
      .getOne();

    if(!jobSheetReceivable) {
      throw new NotFoundException(
        'Data job sheet receivable not found!',
      );
    }

    if (jobSheetReceivable.paidCurrency && jobSheetReceivable.paidCurrency !== body.currency) {
      throw new BadRequestException(
        'Paid currency must be same as previous payment',
      );
    }

    const exchangeRate = jobSheetReceivable.exchangeRate;

    if (body.currency === 'IDR') {
      if (Number(amountPaid) > Number(jobSheetReceivable.remainingAmount)) {
        throw new BadRequestException(
          'The payment you entered exceeds the remaining payable amount',
        );
      }
    } else {
      if (Number(amountPaid) > Number(jobSheetReceivable.remainingAmountCurrency)) {
        throw new BadRequestException(
          'The payment you entered exceeds the remaining payable amount',
        );
      }
    }

    const totalPaidAmount = await this.getTotalPaidAmount(
      invoiceNumber,
      amountPaid,
      body.currency,
    );

    const amountRemaining =
      Number(jobSheetReceivable.remainingAmount) -
      (body.currency === 'IDR'
        ? Number(amountPaid)
        : Number(amountPaid) * exchangeRate);

    let amountRemainingCurrency = 0;
    let amountPaidCurrency = '';

    if (exchangeRate) {
      amountRemainingCurrency =
        Number(jobSheetReceivable.remainingAmountCurrency) -
        (body.currency !== 'IDR'
          ? Number(amountPaid)
          : Number(amountPaid) / exchangeRate);

      amountPaidCurrency =
        body.currency !== 'IDR'
          ? amountPaid.toString()
          : (Number(amountPaid) / exchangeRate).toString();
    } else {
      amountRemainingCurrency =
        Number(jobSheetReceivable.remainingAmountCurrency) -
        (body.currency !== 'IDR' ? Number(amountPaid) : 0);

      amountPaidCurrency =
        body.currency !== 'IDR' ? amountPaid.toString() : Number(0).toString();
    }

    return await this.connection.transaction(async (entityManager) => {

      const jobSheetReceivablePaymentRepo = await this.connection.transaction(async (entityManager) => {
        // upload file if exists

        if (file) {
          const mimeTypes = [
            'application/msword', // .doc
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
            'application/pdf',
            'image/jpeg', // .jpg and .jpeg
            'image/png', //png
          ];
          if (!mimeTypes.includes(file.mimetype)) {
            throw new BadRequestException(
              'Only allows upload doc, docx, pdf, png, jpg, or jpeg extension',
            );
          }

          const fileExt = '.' + file.originalname.split('.').pop();
          const hashedFileName = `${crypto
            .randomBytes(32)
            .toString('hex')}${fileExt}`;

          await this.s3Service.uploadFiles([{
            file,
            fileExt,
            hashedFileName,
          }]);

          const fileContainer = 'saas';
          const fileName = hashedFileName;

          Object.assign(body,{
            fileContainer,
            fileName,
            originalName: file.originalname,
            url: `${process.env.URL_S3}/${fileContainer}/${fileName}`,
          });
        }

        Object.assign(body,{
          createdByUserId: userId,
          invoiceNumber,
          amountPaid:
            body.currency === 'IDR'
              ? amountPaid
              : (Number(amountPaid) * exchangeRate).toString(),
          amountPaidCurrency,
          amountRemaining,
          amountRemainingCurrency,
        })

        const jobSheetReceivablePaymentRepo = await entityManager.save(this.jobSheetReceivablePaymentRepo.create(body));

        const setInvoice = await this.invoiceService.setSettlePaid(
          totalPaidAmount,
          amountPaid,
          jobSheetReceivable,
          user,
          body.currency,
          exchangeRate,
        );

        Object.assign(jobSheetReceivable,{
          ...setInvoice,
          arStatus: setInvoice.invoiceProcess,
        });

        await entityManager.save(jobSheetReceivable);

        return jobSheetReceivablePaymentRepo;
      });

      // update job sheet ap status
      await this.jobSheetService.updateArStatus(jobSheetReceivable.jobSheetNumber, companyId);

      return jobSheetReceivablePaymentRepo;
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
      await this.jobSheetReceivablePaymentRepo
        .createQueryBuilder('rp')
        .where(
          `rp.invoiceNumber = :invoiceNumber AND rp.status = :status`,
          {
            invoiceNumber,
            status: 1,
          },
        )
        .select([
          'SUM(rp.amountPaid) AS sum',
          'SUM(rp.amountPaidCurrency) AS sumCurrency',
        ])
        .getRawOne();

    if(!settledAmount){
      return {
        totalPaymentAmount,
        totalPaymentAmountCurrency,
      }
    }

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

  async paymentDelete(user: CurrentUserDto, jobSheetReceivablePaymentId : number) {
    const { companyId } = user;

    const jobSheetReceivablePayment = await this.jobSheetReceivablePaymentRepo
      .createQueryBuilder('rp')
      .innerJoinAndSelect('rp.invoice','i','i.status = :status')
      .innerJoinAndSelect('i.jobSheet','j', 'j.status = :status')
      .where(`
        rp.id = :jobSheetReceivablePaymentId
        AND j.companyId = :companyId
        AND i.arStatus IN (:arStatus)
        AND rp.status = :status
      `,{
        jobSheetReceivablePaymentId,
        companyId,
        arStatus: [JobSheetReceivableStatus.PENDING, JobSheetReceivableStatus.PARTIALLY_PAID, JobSheetReceivableStatus.PAID],
        status: 1,
      })
      .getOne();

    if(!jobSheetReceivablePayment) {
      throw new NotFoundException(
        'Data job sheet receivable payment not found!',
      );
    }

    const jobSheetReceivable = jobSheetReceivablePayment.invoice;

    return await this.connection.transaction(async (entityManager) => {
      const savedJobSheetReceivablePayment =  await this.connection.transaction(async (entityManager) => {
        jobSheetReceivablePayment.status = 0;
        // delete file if exists
        /*if(jobSheetReceivablePayment.fileName){
          await this.s3Service.deleteFiles([jobSheetReceivablePayment.fileName]);
        }*/


        return await entityManager.save(jobSheetReceivablePayment);
      });

      const savedJobSheetReceivable =  await this.connection.transaction(async (entityManager) => {
        const totalPaidAmount = await this.getTotalPaidAmount(
          jobSheetReceivable.invoiceNumber,
          0,
          jobSheetReceivable.paidCurrency,
        );

        const settledAmount = totalPaidAmount['totalPaymentAmount'];
        const settledAmountCurrency = jobSheetReceivable.exchangeRate ? totalPaidAmount['totalPaymentAmount'] / jobSheetReceivable.exchangeRate : 0;

        jobSheetReceivable.invoiceStatus = InvoiceStatus.ISSUED;

        if(!settledAmount){
          jobSheetReceivable.invoiceProcess = InvoiceProcess.PENDING;
          jobSheetReceivable.arStatus = JobSheetReceivableStatus.PENDING;
          jobSheetReceivable.paidCurrency = null;
        }else{
          jobSheetReceivable.invoiceProcess = InvoiceProcess.PARTIALLY_PAID;
          jobSheetReceivable.arStatus = JobSheetReceivableStatus.PARTIALLY_PAID;
        }

        Object.assign(jobSheetReceivable,{
          settledAmount,
          settledAmountCurrency,
          remainingAmount: (jobSheetReceivable.total - settledAmount).toString(),
          remainingAmountCurrency: (jobSheetReceivable.totalCurrency - settledAmountCurrency).toString(),
        })

        return await entityManager.save(jobSheetReceivable);
      });

      // update job sheet ap status
      await this.jobSheetService.updateArStatus(jobSheetReceivable.jobSheetNumber, companyId);

      return savedJobSheetReceivablePayment;
    });
  }

  async remittance(user: CurrentUserDto, invoiceNumber : string, body: RemittanceJobSheetReceivableDto) {
    const { fullName, email, companyId } = user;

    const paymentId = [];
    body.payments.map(item=> paymentId.push(item.jobSheetReceivablePaymentId));

    const jobSheetReceivable = await this.invoiceRepo
      .createQueryBuilder('i')
      .innerJoinAndSelect('i.jobSheet','j')
      .innerJoinAndSelect('i.receivablePayments','ip','ip.status = :status AND ip.id IN (:paymentId)')
      .where(`
        i.invoiceNumber = :invoiceNumber
        AND j.companyId = :companyId
        AND i.arStatus IN (:arStatus)
      `,{
        invoiceNumber,
        companyId,
        arStatus: [JobSheetReceivableStatus.PAID,JobSheetReceivableStatus.PARTIALLY_PAID],
        status: 1,
        paymentId,
      })
      .getOne();

    if(!jobSheetReceivable) {
      throw new NotFoundException(
        'Data job sheet receivable not found!',
      );
    }

    const company = await this.companyRepo.findOne(jobSheetReceivable.jobSheet.companyId);

    body.payments.map(item => {
      const payload = {
        ffName: company.name,
        ffLogo: company.logo,
        ffEmail: company.email,
        ffAddress: company.address,
        ffPhoneCode: company.phoneCode,
        ffPhoneNumber: company.phoneNumber,
        sender:{
          email,
          fullName,
        },
        subject: item.subject,
        message: item.message,
        cc: item.sendCopy ? email : null
      };

      this.mailService.sendRemittanceJobSheetReceivable(item.sendingTo,payload);
    });

    return jobSheetReceivable;
  }

}
