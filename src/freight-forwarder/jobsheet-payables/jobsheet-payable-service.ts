import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, Repository, Not } from 'typeorm';

import { Helper } from '../helpers/helper';

import { MailService } from 'src/mail/mail.service';
import { JobSheet } from '../../entities/job-sheet.entity';
import { CurrentUserDto } from '../auth/dtos/current-user.dto';
import {
  EAffiliation,
  JobSheetHistoryActionLabel,
  JobSheetPayableHistoryAction,
  JobSheetPayableStatus,
  NotificationActionStatus,
  NotificationType,
  Role,
  Features,
} from '../../enums/enum';
import { CreateJobSheetPayableDto } from './dto/create-job-sheet-payable.dto';
import { JobSheetPayable } from '../../entities/job-sheet-payable.entity';
import { JobSheetPayablePrice } from '../../entities/job-sheet-payable-prices.entity';
import { JobSheetService } from '../jobsheets/jobsheets.service';
import * as crypto from 'crypto';
import { JobSheetPayableFilesService } from '../jobsheet-payable-files/job-sheet-payable-files.service';
import { JobSheetPayableHistoryService } from '../jobsheet-payable-history/jobsheet-payable-history.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ApprovalJobSheetPayableDto } from './dto/approval-job-sheet-payable.dto';
import { ReviseJobSheetPayableDto } from './dto/revise-job-sheet-payable.dto';
import { SubmitPaymentJobSheetPayableDto } from './dto/submit-payment-job-sheet-payable.dto';
import { S3Service } from '../../s3/s3.service';
import { JobSheetPayablePayment } from '../../entities/job-sheet-payable-payment.entity';
import { RemittanceJobSheetPayableDto } from './dto/remittance-job-sheet-payable.dto';
import { Company } from '../../entities/company.entity';

@Injectable()
export class JobSheetPayableService {
  constructor(
    @InjectRepository(JobSheet) private jobSheetRepo: Repository<JobSheet>,
    @InjectRepository(Company) private companyRepo: Repository<Company>,
    @InjectRepository(JobSheetPayable) private jobSheetPayableRepo: Repository<JobSheetPayable>,
    @InjectRepository(JobSheetPayablePrice) private jobSheetPayablePriceRepo: Repository<JobSheetPayablePrice>,
    @InjectRepository(JobSheetPayablePayment) private jobSheetPayablePaymentRepo: Repository<JobSheetPayablePayment>,
    private mailService: MailService,
    private helper: Helper,
    private connection: Connection,
    private jobSheetService: JobSheetService,
    private jobSheetPayableFileService: JobSheetPayableFilesService,
    private jobSheetPayableHistoryService: JobSheetPayableHistoryService,
    private notificationsService: NotificationsService,
    private s3Service: S3Service,
  ) {}

  async create(user: CurrentUserDto, body: CreateJobSheetPayableDto, files : Array<Express.Multer.File>) {
    const { userId, companyId } = user;

    const { prices, invoiceNumber } = body;

    // validasi invoice number untuk modul finance only
    const jp = await this.jobSheetPayableRepo.findOne({
      where:{
        invoiceNumber,
      }
    })

    if(!user.companyFeatureIds?.includes(Features.ALL_FEATURES) && user.companyFeatureIds?.includes(Features.FINANCE) && jp) throw new BadRequestException( 'Invoice number already used!',);

    const jobSheet = await this.jobSheetService.getOneJobSheet({
      jobSheetNumber: body.jobSheetNumber,
      companyId,
    })

    if(files.length == 0) throw new BadRequestException( 'Attachment is required!');

    // calculate amount due, amount paid, amount remaining
    const amountDue = {};
    const amountPaid = {};
    const amountRemaining = {};

    prices.map((price,index) => {

      const totalPrice = Number((price.qty * price.priceAmount + (((price.qty * price.priceAmount)*price.ppn)/100)).toFixed(2));

      Object.assign(price,{
        totalPrice,
        jobSheetPayableId:0,
        createdByUserId: user.userId
      })

      if(!amountDue[price.currency]) amountDue[price.currency] = 0;
      if(!amountRemaining[price.currency]) amountRemaining[price.currency] = 0;
      if(!amountPaid[price.currency]) amountPaid[price.currency] = 0;

      amountDue[price.currency] += totalPrice;
      amountRemaining[price.currency] += totalPrice;
      amountPaid[price.currency] = 0;

      prices[index] = price;
    });

    const newJobSheetPayable = await this.jobSheetPayableRepo.create({
      ...body,
      amountDue,
      amountRemaining,
      amountPaid,
      apStatus: JobSheetPayableStatus.WAITING_APPROVAL,
      createdByUserId: userId
    });

    // mapping files

    const uploads = [];
    if (files?.length) {
      for (let file of files) {
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

        const data = {
          file,
          fileExt,
          hashedFileName,
        };
        uploads.push(data);
      }
    }

    return await this.connection.transaction(async (entityManager) => {

      const jobSheetPayable = await this.connection.transaction(async (entityManager) => {

        const jobSheetPayable = await entityManager.save(newJobSheetPayable);

        prices.map((item,index)=>{
          prices[index]['jobSheetPayableId'] = jobSheetPayable.id;
        })

        // insert into payable prices
        jobSheetPayable.prices = await entityManager.save(await this.jobSheetPayablePriceRepo.create(prices));

        // insert payable attachment
        jobSheetPayable.files = await this.jobSheetPayableFileService.update(userId,jobSheetPayable.id,'',uploads);

        // insert payable history

        jobSheetPayable.histories = [
          await this.jobSheetPayableHistoryService.submit(userId,jobSheetPayable.id,{
            action: JobSheetPayableHistoryAction.CREATED,
            details: JobSheetHistoryActionLabel[JobSheetPayableHistoryAction.CREATED]
          })
        ];

        // send notification
        this.notificationsService.notifyInternalApproval(user,NotificationType.JOB_SHEET,NotificationActionStatus.JOB_SHEET_PAYABLE_WAITING_CONFIRMATION,{jobSheetNumber : jobSheet.jobSheetNumber});

        return jobSheetPayable;
      });

      // update job sheet ap status
      await this.jobSheetService.updateApStatus(jobSheet.jobSheetNumber, jobSheet.companyId);

      return jobSheetPayable;
    });
  }

  async getDetail(user: CurrentUserDto, jobSheetPayableId: number) {
    const jobSheetPayable = await this.jobSheetPayableRepo
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.jobSheet','j')
      .leftJoinAndSelect('j.quotation', 'q')
      .leftJoinAndSelect('q.customer', 'c')
      .leftJoinAndSelect('p.prices','pr','pr.status = :status')
      .leftJoinAndSelect('p.files','pf')
      .leftJoinAndSelect('p.payments','pp','pp.status = :status')
      .leftJoinAndSelect('p.histories','ph','ph.status = :status')
      .leftJoin('ph.creator', 'cr')
      .where(`
        p.id = :jobSheetPayableId
        AND (${ !user.isTrial ? `j.companyId = :companyId` : `j.affiliation = :dummyAffiliation`})
      `,{
        jobSheetPayableId,
        companyId: user.companyId,
        dummyAffiliation: EAffiliation.DUMMY,
        status: 1,
      })
      .select([
        'p',
        'j.rfqNumber',
        'q.cityFrom',
        'q.cityTo',
        'c.companyName',
        'j.jobSheetNumber',
        'pr.priceComponent',
        'pr.uom',
        'pr.currency',
        'pr.priceAmount',
        'pr.qty',
        'pr.ppn',
        'pr.totalPrice',
        'pf.id',
        'pf.originalName',
        'pf.url',
        'pf.createdAt',
        'ph.id',
        'ph.action',
        'ph.createdAt',
        'cr.fullName',
        'ph.details',
        'pp.id',
        'pp.currency',
        'pp.amountPaid',
        'pp.paymentDate',
        'pp.bankAccount',
        'pp.bankHolder',
        'pp.originalName',
        'pp.url',
        'pp.createdAt',
      ])
      .orderBy('ph.createdAt','DESC')
      .getOne()

    if(!jobSheetPayable) {
      throw new NotFoundException(
        'Data job sheet payable not found!',
      );
    }

    const result = {
      id: jobSheetPayable.id,
      jobSheetNumber: jobSheetPayable.jobSheetNumber,
      invoiceNumber: jobSheetPayable.invoiceNumber,
      vendorName: jobSheetPayable.vendorName,
      payableDate: jobSheetPayable.payableDate,
      dueDate: jobSheetPayable.dueDate,
      apStatus: jobSheetPayable.apStatus,
      note: jobSheetPayable.note,
      prices:jobSheetPayable.prices,
      amountDue: jobSheetPayable.amountDue,
      amountRemaining: jobSheetPayable.amountRemaining,
      amountPaid: jobSheetPayable.amountPaid,
      rfqNumber: jobSheetPayable.jobSheet?.rfqNumber ?? '-',
      companyName: jobSheetPayable.jobSheet?.quotation?.customer?.companyName ?? '-',
      cityFrom: jobSheetPayable.jobSheet?.quotation?.cityFrom ?? '-',
      cityTo: jobSheetPayable.jobSheet?.quotation?.cityTo ?? '-',
      files: jobSheetPayable.files ?? [],
      payments: jobSheetPayable.payments ?? [],
      histories: [],
    };

    jobSheetPayable.histories.map(item=>{
      const creator = item.creator?.fullName ?? '-';
      delete item.creator;
      result.histories.push({
        ...item,
        creator
      });
    })

    return result;
  }

  async approval(user: CurrentUserDto, jobSheetPayableId: number, body: ApprovalJobSheetPayableDto) {
    const jobSheetPayable = await this.jobSheetPayableRepo.createQueryBuilder('p')
      .innerJoinAndSelect('p.jobSheet','j')
      .leftJoinAndSelect('p.histories','ph','ph.status = :status')
      .leftJoin('ph.creator', 'cr')
      .where(`
        p.id = :jobSheetPayableId
        AND p.apStatus IN (:apStatus)
        AND j.companyId = :companyId
        AND p.status = :status
        AND j.status = :status
      `,{
        status:1,
        companyId: user.companyId,
        jobSheetPayableId,
        apStatus: [JobSheetPayableStatus.WAITING_APPROVAL]
      })
      .getOne();

    if(!jobSheetPayable) {
      throw new NotFoundException(
        'Data job sheet payable not found!',
      );
    }

    if(jobSheetPayable.apStatus == JobSheetPayableStatus.WAITING_APPROVAL){
      if(![Role.ADMIN,Role.MANAGER].includes(<Role>user.role)){
        throw new BadRequestException(
          'Approval only for Role Manager!',
        );
      }
    }


    if(body.action == JobSheetPayableStatus.REJECTED && !body.rejectReason ) {
      throw new BadRequestException(
        'Reject reason is required!',
      );
    }

    return await this.connection.transaction(async (entityManager) => {

      const savedJobSheetPayable = await this.connection.transaction(async (entityManager) => {

        jobSheetPayable.apStatus = body.action;
        await entityManager.save(jobSheetPayable);

        // insert payable history
        jobSheetPayable.histories.unshift(await this.jobSheetPayableHistoryService.submit(user.userId,jobSheetPayable.id,{
          action: body.action,
          details: body.action == JobSheetPayableStatus.APPROVED ? JobSheetHistoryActionLabel[JobSheetPayableStatus.APPROVED] : JobSheetHistoryActionLabel[JobSheetPayableStatus.REJECTED] + body.rejectReason
        }));

        // send notification
        this.notificationsService.notifyInternalApproval(user,NotificationType.JOB_SHEET,body.action,{ jobSheetNumber : jobSheetPayable.jobSheet.jobSheetNumber}, true, [jobSheetPayable.createdByUserId]);

        return jobSheetPayable;
      });

      // update job sheet ap status
      await this.jobSheetService.updateApStatus(savedJobSheetPayable.jobSheet.jobSheetNumber, savedJobSheetPayable.jobSheet.companyId);

      return savedJobSheetPayable;
    });
  }

  async revise(user: CurrentUserDto, jobSheetPayableId : number, body: ReviseJobSheetPayableDto, files : Array<Express.Multer.File>) {
    const { userId, companyId } = user;

    const { prices, invoiceNumber } = body;

    const jobSheetPayable = await this.jobSheetPayableRepo
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.jobSheet','j')
      .leftJoinAndSelect('p.payments','pp','pp.status = :status')
      .leftJoinAndSelect('p.histories','ph','ph.status = :status')
      .leftJoin('ph.creator', 'cr')
      .where(`
        p.id = :jobSheetPayableId
        AND j.companyId = :companyId
        AND p.apStatus = :apStatus
      `,{
        jobSheetPayableId,
        companyId: user.companyId,
        apStatus: JobSheetPayableStatus.REJECTED,
        status: 1,
      })
      .orderBy('ph.createdAt','DESC')
      .getOne();

    if(!jobSheetPayable) {
      throw new NotFoundException(
        'Data job sheet payable not found!',
      );
    }

    // validasi invoice number
    if(await this.jobSheetPayableRepo.findOne({
      where:{
        invoiceNumber,
        id: Not(jobSheetPayableId)
      }
    })) throw new BadRequestException( 'Invoice number already used!',);

    // calculate amount due, amount paid, amount remaining
    const amountDue = {};
    const amountPaid = {};
    const amountRemaining = {};

    prices.map((price,index) => {

      const totalPrice = Number((price.qty * price.priceAmount + (((price.qty * price.priceAmount)*price.ppn)/100)).toFixed(2));

      Object.assign(price,{
        totalPrice,
        jobSheetPayableId: jobSheetPayable.id,
        createdByUserId: user.userId
      })

      if(!amountDue[price.currency]) amountDue[price.currency] = 0;
      amountDue[price.currency] += totalPrice;
      amountPaid[price.currency] = 0;
      amountRemaining[price.currency] += totalPrice;

      prices[index] = price;
    });

    delete body.prices;

    Object.assign(jobSheetPayable,{
      ...body,
      amountDue,
      apStatus: JobSheetPayableStatus.WAITING_APPROVAL,
    });

    // mapping files

    const uploads = [];
    if (files?.length) {
      for (let file of files) {
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

        const data = {
          file,
          fileExt,
          hashedFileName,
        };
        uploads.push(data);
      }
    }

    return await this.connection.transaction(async (entityManager) => {

      const updatedJobSheetPayable = await this.connection.transaction(async (entityManager) => {

        await entityManager.save(jobSheetPayable);

        // deleted current prices
        await entityManager.update(JobSheetPayablePrice,{
          jobSheetPayableId
        },{
          status:0
        });

        // insert into payable prices
        jobSheetPayable.prices = await entityManager.save(this.jobSheetPayablePriceRepo.create(prices));

        // insert payable attachment
        jobSheetPayable.files = await this.jobSheetPayableFileService.update(userId,jobSheetPayable.id,body.deletedFiles,uploads);

        // insert payable history
        jobSheetPayable.histories.unshift(await this.jobSheetPayableHistoryService.submit(userId,jobSheetPayable.id,{
          action: JobSheetPayableHistoryAction.REVISE,
          details: JobSheetHistoryActionLabel[JobSheetPayableHistoryAction.REVISE]
        }))

        return jobSheetPayable;
      });

      // update job sheet ap status
      await this.jobSheetService.updateApStatus(jobSheetPayable.jobSheet.jobSheetNumber, jobSheetPayable.jobSheet.companyId);

      return updatedJobSheetPayable;
    });
  }

  async payment(user: CurrentUserDto, jobSheetPayableId : number, body: SubmitPaymentJobSheetPayableDto, file : Express.Multer.File) {
    const { userId, companyId } = user;

    const jobSheetPayable = await this.jobSheetPayableRepo
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.jobSheet','j')
      .leftJoinAndSelect('p.payments','pp','pp.status = :status')
      .where(`
        p.id = :jobSheetPayableId
        AND j.companyId = :companyId
        AND p.apStatus IN (:apStatus)
      `,{
        jobSheetPayableId,
        companyId,
        apStatus: [JobSheetPayableStatus.APPROVED,JobSheetPayableStatus.PARTIALLY_PAID, ],
        status: 1,
      })
      .getOne();

    if(!jobSheetPayable) {
      throw new NotFoundException(
        'Data job sheet payable not found!',
      );
    }

    return await this.connection.transaction(async (entityManager) => {

      const jobSheetPayablePaymentRepo = await this.connection.transaction(async (entityManager) => {
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

        let amountRemaining = Number((Number(jobSheetPayable.amountRemaining[body.currency]) - Number(body.amountPaid)).toFixed(2));

        Object.assign(body,{
          createdByUserId: userId,
          jobSheetPayableId,
          amountRemaining,
        })

        return await entityManager.save(this.jobSheetPayablePaymentRepo.create(body));
      });

      // calculate remaining and paid amount
      await this.calculatePaidPayable(user,jobSheetPayable);

      return jobSheetPayablePaymentRepo;
    });
  }

  async paymentDelete(user: CurrentUserDto, jobSheetPayablePaymentId : number) {
    const { companyId } = user;

    const jobSheetPayablePayment = await this.jobSheetPayablePaymentRepo
      .createQueryBuilder('pp')
      .innerJoinAndSelect('pp.jobSheetPayable','p','p.status = :status')
      .innerJoinAndSelect('p.jobSheet','j', 'j.status = :status')
      .where(`
        pp.id = :jobSheetPayablePaymentId
        AND j.companyId = :companyId
        AND p.apStatus IN (:apStatus)
        AND pp.status = :status
      `,{
        jobSheetPayablePaymentId,
        companyId,
        apStatus: [JobSheetPayableStatus.APPROVED, JobSheetPayableStatus.PARTIALLY_PAID, JobSheetPayableStatus.PAID],
        status: 1,
      })
      .getOne();

    if(!jobSheetPayablePayment) {
      throw new NotFoundException(
        'Data job sheet payable payment not found!',
      );
    }

    const jobSheetPayable = jobSheetPayablePayment.jobSheetPayable;

    return await this.connection.transaction(async (entityManager) => {
      const savedJobSheetPayablePayment =  await this.connection.transaction(async (entityManager) => {
        jobSheetPayablePayment.status = 0;
        // delete file if exists
        /*if(jobSheetPayablePayment.fileName){
          await this.s3Service.deleteFiles([jobSheetPayablePayment.fileName]);
        }*/
        return await entityManager.save(jobSheetPayablePayment);
      });

      // calculate remaining and paid amount
      await this.calculatePaidPayable(user,jobSheetPayable);

      return savedJobSheetPayablePayment;
    });
  }

  async remittance(user: CurrentUserDto, jobSheetPayableId : number, body: RemittanceJobSheetPayableDto) {
    const { fullName, email, companyId } = user;

    const paymentId = [];
    body.payments.map(item=> paymentId.push(item.jobSheetPayablePaymentId));

    const jobSheetPayable = await this.jobSheetPayableRepo
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.jobSheet','j')
      .innerJoinAndSelect('p.payments','pp','pp.status = :status AND pp.id IN (:paymentId)')
      .where(`
        p.id = :jobSheetPayableId
        AND j.companyId = :companyId
        AND p.apStatus IN (:apStatus)
      `,{
        jobSheetPayableId,
        companyId,
        apStatus: [JobSheetPayableStatus.PAID,JobSheetPayableStatus.PARTIALLY_PAID],
        status: 1,
        paymentId,
      })
      .getOne();

    if(!jobSheetPayable) {
      throw new NotFoundException(
        'Data job sheet payable not found!',
      );
    }

    const company = await this.companyRepo.findOne(jobSheetPayable.jobSheet.companyId);

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

      this.mailService.sendRemittanceJobSheetPayable(item.sendingTo,payload);
    });

    return jobSheetPayable;
  }

  async calculatePaidPayable(user: CurrentUserDto, jobSheetPayable : JobSheetPayable) {

    const totalPayment = await this.jobSheetPayablePaymentRepo
        .createQueryBuilder('py')
        .where('py.jobSheetPayableId = :jobSheetPayableId', { jobSheetPayableId: jobSheetPayable.id })
        .andWhere('py.status = :status', { status: 1 })
        .select([
          'SUM(py.amountPaid) AS sumAmountPaid',
          'py.currency as currency',
        ])
        .groupBy('py.currency')
        .getRawMany();

    const result = {amountPaid:{},amountRemaining:{}};
    const amountDue = jobSheetPayable.amountDue;

    let paid = false;let remaining = false;

    Object.keys(amountDue).forEach(currency => {
      if(!result.amountPaid[currency]) result.amountPaid[currency] = 0;
      if(!result.amountRemaining[currency]) result.amountRemaining[currency] = amountDue[currency];

      totalPayment.map(item =>{
        if(item.currency == currency){
          result.amountPaid[currency] += Number(item.sumAmountPaid);
          result.amountRemaining[currency] = Number((Number(amountDue[currency]) - Number(item.sumAmountPaid)).toFixed(2));
        }
      })

      if(result.amountPaid[currency] > 0 && !paid ) paid = true;
      if(result.amountRemaining[currency] > 0 && !remaining ) remaining = true;

    });

    const apStatus = paid ? ( !remaining ? JobSheetPayableStatus.PAID : JobSheetPayableStatus.PARTIALLY_PAID ) : JobSheetPayableStatus.APPROVED;

    await this.jobSheetPayableRepo.update(jobSheetPayable.id,{
      amountPaid: result.amountPaid,
      amountRemaining: result.amountRemaining,
      apStatus: apStatus,
    });

    // update job sheet ap status
    await this.jobSheetService.updateApStatus(jobSheetPayable.jobSheet.jobSheetNumber, jobSheetPayable.jobSheet.companyId);

    return result;
  }

}
