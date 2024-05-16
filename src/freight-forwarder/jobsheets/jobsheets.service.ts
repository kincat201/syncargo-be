import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, Not, Repository } from 'typeorm';

import {
  EAffiliation,
  InvoiceStatus,
  JobSheetItemType,
  JobSheetPayableStatus, JobSheetReceivableStatus,
  Features,
} from 'src/enums/enum';
import { Helper } from '../helpers/helper';

import { CurrentUserDto } from '../auth/dtos/current-user.dto';

import { MailService } from 'src/mail/mail.service';
import { JobSheet } from '../../entities/job-sheet.entity';

import { CreateUpdateJobSheetDto } from './dto/create-update-job-sheet.dto';
import { DeleteJobSheetDto } from './dto/delete-job-sheet.dto';
import { CreateUpdateJobSheetPnlDto } from './dto/create-update-job-sheet-pnl.dto';
import { Customer } from '../../entities/customer.entity';
import { SaveJobSheetShipmentDto } from './dto/save-job-sheet-shipment.dto';
import { JobSheetShipment } from '../../entities/job-sheet-shipment.entity';


@Injectable()
export class JobSheetService {
  constructor(
    @InjectRepository(JobSheet) private jobSheetRepo: Repository<JobSheet>,
    @InjectRepository(JobSheetShipment) private jobSheetShipmentRepo: Repository<JobSheetShipment>,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    private mailService: MailService,
    private helper: Helper,
    private connection: Connection,
  ) {}

  async getPaged(
    page: number,
    perpage: number,
    itemType: JobSheetItemType,
    jobSheetStatus: string,
    createdAt: string,
    search: string,
    currentUser: CurrentUserDto,
  ) {
    const limit = perpage;
    const offset = perpage * (page - 1);
    const query = this.jobSheetRepo
      .createQueryBuilder('j')
      .select([
        'j.id',
        'j.jobSheetNumber',
        'j.rfqNumber',
        'j.customerId',
        'j.itemType',
        'j.apStatus',
        'j.arStatus',
        'j.createdAt',
        'j.updatedAt',
        'c.companyName',
      ])
      .where(
        `
        j.status = :status
        AND (${ !currentUser.isTrial ? `j.companyId = :companyId` : `j.affiliation = :dummyAffiliation`})
      `,
      )
      .leftJoin('j.customer', 'c')
      .groupBy('j.jobSheetNumber')
      .setParameters({
        companyId: currentUser.companyId,
        dummyAffiliation: EAffiliation.DUMMY,
        status: 1,
      })
      .orderBy('j.updatedAt', 'DESC');

    
    let createdFromFeature : number;
    if (currentUser.companyFeatureIds.includes(Features.ALL_FEATURES)){
      createdFromFeature = Features.ALL_FEATURES;
    }else{
      createdFromFeature = Features.FINANCE;
    }

    // add feature flag
    query.andWhere('j.createdFromFeature = :createdFromFeature', {createdFromFeature});

    if (itemType) {
      query.andWhere('(j.itemType = :itemType)', { itemType });
    }

    if(jobSheetStatus){
      query.andWhere(
        `(
          j.apStatus like :jobSheetStatus OR j.arStatus like :jobSheetStatus
        )`,
        { jobSheetStatus: `%${jobSheetStatus}%` },
      );
    }

    if (createdAt) {
      const from = createdAt.split('to')[0];
      const until = createdAt.split('to')[1];
      query.andWhere(
        `(DATE(j.createdAt) >= :from AND DATE(j.createdAt) <= :until)`,
        { from, until },
      );
    }

    if (search) {
      query.andWhere(
        `(
          j.rfqNumber like :search 
          OR j.jobSheetNumber like :search
        )`,
        { search: `%${search}%` },
      );
    }
    const allData = await query.getMany();
    const totalRecord = allData.length;

    const data = await query.limit(limit).offset(offset).getMany();

    // append all status
    data.map(item=> {
      this.helper.appendJobSheetStatus(item);
    })

    const totalShowed = data.length;

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
  }

  async getDetail(user: CurrentUserDto, jobSheetNumber: string) {
    const data = await this.jobSheetRepo
      .createQueryBuilder('j')
      .leftJoinAndSelect('j.quotation', 'q')
      .leftJoinAndSelect('q.customer', 'c')
      .leftJoinAndSelect(
        'q.invoices',
        'i',
        'i.invoiceStatus IN (:invoiceStatus)',
      )
      .leftJoinAndSelect(
        'j.payables',
        'p',
      )
      .leftJoinAndSelect(
        'j.receivables',
        'r',
      )
      .leftJoin('j.customer', 'jc')
      .leftJoin('r.customer', 'rc')
      .leftJoin('r.thirdParties', 'tp')
      .leftJoinAndSelect('j.jobSheetShipment', 's')
      .where(
        `
        j.jobSheetNumber = :jobSheetNumber 
        AND j.status = :status
        AND (${ !user.isTrial ? `j.companyId = :companyId` : `j.affiliation = :dummyAffiliation`})
      `,
      )
      .select([
        'j.jobSheetNumber',
        'j.itemType',
        'j.rfqNumber',
        'j.affiliation',
        'j.customerId',
        'j.apExchangeRate',
        'jc.companyName',
        'jc.typeOfPayment',
        'q.cityFrom',
        'q.cityTo',
        'c.companyName',
        'i.invoiceNumber',
        'i.dueDate',
        'i.total',
        'i.totalCurrency',
        'i.remainingAmount',
        'i.remainingAmountCurrency',
        'i.currency',
        'i.invoiceStatus',
        'i.invoiceProcess',
        'i.exchangeRate',
        'p.id',
        'p.invoiceNumber',
        'p.vendorName',
        'p.payableDate',
        'p.dueDate',
        'p.amountDue',
        'p.amountRemaining',
        'p.amountPaid',
        'p.apStatus',
        'r.id',
        'r.invoiceNumber',
        'r.invoiceDate',
        'r.dueDate',
        'r.total',
        'r.totalCurrency',
        'r.remainingAmount',
        'r.remainingAmountCurrency',
        'r.currency',
        'r.invoiceStatus',
        'r.invoiceProcess',
        'r.exchangeRate',
        'r.arStatus',
        'r.customerId',
        'r.thirdPartyId',
        'rc.companyName',
        'tp',
        's.shipmentVia',
        's.shipmentService',
        's.countryFrom',
        's.countryFromCode',
        's.countryFromId',
        's.portOfLoading',
        's.cityFrom',
        's.countryTo',
        's.countryToCode',
        's.countryToId',
        's.cityTo',
        's.portOfDischarge',
        's.remarks',
      ])
      .setParameters({
        jobSheetNumber,
        invoiceStatus:[InvoiceStatus.ISSUED,InvoiceStatus.SETTLED],
        companyId: user.companyId,
        dummyAffiliation: EAffiliation.DUMMY,
        status: 1,
      })
      .getOne();
    
    if (!data) {
      throw new NotFoundException('Data not found');
    }

    const result = {
      jobSheetNumber: data.jobSheetNumber,
      rfqNumber: data.rfqNumber,
      itemType: data.itemType,
      customerId: data.customerId,
      companyName: data.rfqNumber ? (data.quotation?.customer?.companyName ?? '-') : (data.customer?.companyName ?? '-'),
      typeOfPayment: data.customer?.typeOfPayment,
      cityFrom: data.quotation?.cityFrom ?? '-',
      cityTo: data.quotation?.cityTo ?? '-',
      jobSheetShipment: data.jobSheetShipment ? data.jobSheetShipment : null,
      accountReceivable:null,
      accountPayable:null,
      profitAndLoss:null,
    };

    if([JobSheetItemType.AR,JobSheetItemType.AP_AR].includes(<JobSheetItemType>data.itemType)){
      const accountReceivable = {
        approvedGrandTotal:{'IDR':0},
        remainingPayable:{'IDR':0},
        invoices:[],
        receivable:[],
      };
      
      if(data.quotation){
        data.quotation.invoices.map(item=>{
          if(!accountReceivable.approvedGrandTotal[item.currency]) accountReceivable.approvedGrandTotal[item.currency] = 0;
          if(!accountReceivable.remainingPayable[item.currency]) accountReceivable.remainingPayable[item.currency] = 0;

          accountReceivable.approvedGrandTotal['IDR'] += item.total ? Number(item.total) : 0;
          accountReceivable.remainingPayable['IDR'] += item.remainingAmount ? Number(item.remainingAmount) : 0;

          if(item.currency != 'IDR'){
            accountReceivable.approvedGrandTotal[item.currency] += item.totalCurrency ? Number(item.totalCurrency) : 0;
            accountReceivable.remainingPayable[item.currency] += item.remainingAmountCurrency ? Number(item.remainingAmountCurrency) : 0;
          }

          accountReceivable.invoices.push(item);
        })
      }

      data.receivables.map(item => {

        if(![
          JobSheetReceivableStatus.WAITING_APPROVAL,
          JobSheetReceivableStatus.REJECTED,
        ].includes(<JobSheetReceivableStatus> item.arStatus)){

          if(!accountReceivable.approvedGrandTotal[item.currency]) accountReceivable.approvedGrandTotal[item.currency] = 0;
          if(!accountReceivable.remainingPayable[item.currency]) accountReceivable.remainingPayable[item.currency] = 0;

          accountReceivable.approvedGrandTotal['IDR'] += item.total ? Number(item.total) : 0;
          accountReceivable.remainingPayable['IDR'] += item.remainingAmount ? Number(item.remainingAmount) : 0;

          if(item.currency != 'IDR'){
            accountReceivable.approvedGrandTotal[item.currency] += item.totalCurrency ? Number(item.totalCurrency) : 0;
            accountReceivable.remainingPayable[item.currency] += item.remainingAmountCurrency ? Number(item.remainingAmountCurrency) : 0;
          }

        }

        if (item.thirdParties) {
          item['recipient'] = 'Third Party';
          item['thirdPartyCompanyName'] = item.thirdParties.companyName;
          item['thirdPartyEmail'] = item.thirdParties.email;
        } else {
          item['recipient'] = 'Customer';
        }

        delete item.thirdParties;

        accountReceivable.receivable.push(item);
      })

      result.accountReceivable = accountReceivable;
    }

    if([JobSheetItemType.AP,JobSheetItemType.AP_AR].includes(<JobSheetItemType>data.itemType)){
      const accountPayable = {
        approvedGrandTotal:{},
        remainingPayable:{},
        payable:[],
      };

      data.payables.map(item=>{
        if([JobSheetPayableStatus.APPROVED,JobSheetPayableStatus.PARTIALLY_PAID,JobSheetPayableStatus.PAID].includes(<JobSheetPayableStatus>item.apStatus)){
          if (!item.amountDue){
            item.amountDue = {};
          }
          Object.keys(item.amountDue).forEach(currency =>{
            if(!accountPayable.approvedGrandTotal[currency]) accountPayable.approvedGrandTotal[currency] = 0;
            if(!accountPayable.remainingPayable[currency]) accountPayable.remainingPayable[currency] = 0;

            accountPayable.approvedGrandTotal[currency] += item.amountDue[currency];
            accountPayable.remainingPayable[currency] += item.amountRemaining[currency];
          })
        }
        accountPayable.payable.push(item);

        result.accountPayable = accountPayable;
      })
    }

    if ([JobSheetItemType.AP, JobSheetItemType.AR, JobSheetItemType.AP_AR].includes(<JobSheetItemType>data.itemType)) {
      const profitAndLoss = {
        accountReceivable : null,
        accountPayable : null,
      }

      if ([JobSheetItemType.AR,JobSheetItemType.AP_AR].includes(<JobSheetItemType>data.itemType) && (result.accountReceivable)) {
        profitAndLoss.accountReceivable = {
          invoices : [],
          receivables:[],
          total : 0,
        };
        if(data.quotation){
          var invoicesGroup = [];
          
          data.quotation.invoices.forEach(item => {
            const invoice = {
              total : Number(item.total),
              totalCurrency : Number(item.totalCurrency),
              currency : item.currency,
              exchangeRate : Number(item.exchangeRate),
            }
            profitAndLoss.accountReceivable.total += Number(item.total);
            if (invoice.currency == 'IDR'){
              invoice.exchangeRate = 1;
            }
            invoicesGroup.push(invoice);
          });     

          // same currency and sama exchangerate
          const resInvoicesGroup : any[] = [];
          invoicesGroup.forEach((item) => {
            const index = resInvoicesGroup.findIndex((group) => group.currency === item.currency && group.exchangeRate === item.exchangeRate);
            if (index === -1) {
              resInvoicesGroup.push(item);
            }else{
              resInvoicesGroup[index].total += item.total;
              resInvoicesGroup[index].totalCurrency += item.totalCurrency;
            }
          });
          profitAndLoss.accountReceivable.invoices = resInvoicesGroup;
        }

        var receivablesGroup = [];
        
        data.receivables.forEach(item => {
          if([
            JobSheetReceivableStatus.APPROVED,
            JobSheetReceivableStatus.PENDING,
            JobSheetReceivableStatus.PARTIALLY_PAID,
            JobSheetReceivableStatus.PAID,
          ].includes(<JobSheetReceivableStatus> item.arStatus)){
            const receivable = {
              total : Number(item.total),
              totalCurrency : Number(item.totalCurrency),
              currency : item.currency,
              exchangeRate : Number(item.exchangeRate),
            }
            profitAndLoss.accountReceivable.total += Number(item.total);
            if (receivable.currency == 'IDR'){
              receivable.exchangeRate = 1;
            }
            receivablesGroup.push(receivable);
          }
          
        });

        const resReceivablesGroup : any[] = [];
        receivablesGroup.forEach((item) => {
          const index = resReceivablesGroup.findIndex((group) => group.currency === item.currency && group.exchangeRate === item.exchangeRate);
          if (index === -1) {
            resReceivablesGroup.push(item);
          }else{
            resReceivablesGroup[index].total += item.total;
            resReceivablesGroup[index].totalCurrency += item.totalCurrency;
          }
        });
        profitAndLoss.accountReceivable.receivables = resReceivablesGroup;

      }
      
      if ([JobSheetItemType.AP,JobSheetItemType.AP_AR].includes(<JobSheetItemType>data.itemType) && (result.accountPayable)) {
        profitAndLoss.accountPayable = {
          approvedGrandTotal : [],
        };
        var apExchangeRate : object = {};
        if (data.apExchangeRate){
          apExchangeRate = data.apExchangeRate;
        }
        Object.entries(result.accountPayable.approvedGrandTotal).forEach(([currency, value]) => {
          const approvedGrandTotalCurrency = {
            total : 0,
            exchangeRate : 0,
            totalCurrency : 0,
            currency : currency,
          }
          if (apExchangeRate[currency]){
            approvedGrandTotalCurrency.exchangeRate = apExchangeRate[currency];
          }

          if (currency == 'IDR'){
            approvedGrandTotalCurrency.total = Number(value);
          }else{
            approvedGrandTotalCurrency.totalCurrency = Number(value);
            if (approvedGrandTotalCurrency.exchangeRate > 0){
              approvedGrandTotalCurrency.total = approvedGrandTotalCurrency.totalCurrency * approvedGrandTotalCurrency.exchangeRate;
            }
          }
          profitAndLoss.accountPayable.approvedGrandTotal.push(approvedGrandTotalCurrency);
        });
      }
      
      result.profitAndLoss = profitAndLoss;
    }

    return result;
  }

  async create(user: CurrentUserDto, body: CreateUpdateJobSheetDto) {
    const { userId, companyId, affiliation } = user;

    if(body.rfqNumber){
      if(await this.getOneJobSheet({rfqNumber: body.rfqNumber, status: 1}, true)){
        throw new BadRequestException(
          'Job Sheet with this RFQ already exists!',
        );
      }
    }

    if (body.customerId === ""){
      body.customerId = null;
    }

    if(body.customerId){
      if(await !this.customerRepo.findOne({
          where:{
            customerId:body.customerId,
            companyId
          }
        })
      ){
        throw new BadRequestException(
          'Customer not found!',
        );
      }
    }

    const clientId = `${companyId}`.padStart(4, '0');

    let jobSheetNumber = `JS/${clientId}/`;

    let { count: totalCount } = await this.jobSheetRepo
      .createQueryBuilder('j')
      .select(['COUNT(j.id) AS count'])
      .where(
        `
        j.companyId = :companyId
        AND YEAR(j.createdAt) = YEAR(NOW())
      `,
      )
      .setParameters({ companyId })
      .getRawOne();

    if (totalCount > 0) {
      totalCount++;
      jobSheetNumber += `${totalCount}`.padStart(8, '0');
    } else {
      jobSheetNumber += '00000001';
    }

    let fromFeature : number;
    if (user.companyFeatureIds.includes(Features.ALL_FEATURES)){
      fromFeature = Features.ALL_FEATURES;
    }else{
      fromFeature = Features.FINANCE;
    }

    const newJobSheet = await this.jobSheetRepo.create({
      ...body,
      jobSheetNumber,
      companyId,
      createdByUserId: userId,
      affiliation,
      createdFromFeature : fromFeature,
    });

    return await this.connection.transaction(async (entityManager) => {
      return await entityManager.save(newJobSheet);
    });
  }

  async update(user: CurrentUserDto, jobSheetNumber : string, body: CreateUpdateJobSheetDto) {
    const { companyId } = user;

    const jobSheet = await this.getOneJobSheet({
      jobSheetNumber,
      companyId,
      status:1,
    });

    if(body.rfqNumber){
      if(await this.getOneJobSheet({
        rfqNumber: body.rfqNumber,
        jobSheetNumber: Not(jobSheetNumber),
        status:1,
      },true)){
        throw new BadRequestException(
          'Job Sheet with this RFQ already exists!',
        );
      }
    }

    if (body.customerId === ""){
      body.customerId = null;
    }

    Object.assign(jobSheet,{...body});

    return await this.connection.transaction(async (entityManager) => {
      return await entityManager.save(jobSheet);
    });
  }

  async delete(user: CurrentUserDto, body: DeleteJobSheetDto) {
    const { companyId } = user;

    const jobSheets = await this.jobSheetRepo
      .createQueryBuilder('j')
      .where(`
        j.jobSheetNumber IN (:jobSheetNumber)
        AND j.companyId = :companyId
        AND j.status = :status
      `,{jobSheetNumber : body.jobSheetNumber, companyId, status: 1})
      .getMany();

    if(jobSheets.length === 0){
      throw new BadRequestException(
        'Job Sheet not found!',
      );
    }

    jobSheets.map(jobSheet=>{
      jobSheet.status = 0;
    })

    return await this.connection.transaction(async (entityManager) => {
      return await entityManager.save(jobSheets);
    });
  }

  async getOneJobSheet(condition:any, validate = false){

    const jobSheet = await this.jobSheetRepo.findOne(condition);

    if(!jobSheet && !validate){
      throw new NotFoundException(
        'Data job sheet not found!',
      );
    }

    return jobSheet;
  }

  async updateApStatus(jobSheetNumber:string, companyId){
    const data = await this.jobSheetRepo
      .createQueryBuilder('j')
      .leftJoinAndSelect(
        'j.payables',
        'p',
      )
      .where(
        `
        j.jobSheetNumber = :jobSheetNumber 
        AND j.status = :status
        AND j.companyId = :companyId
      `,
      )
      .setParameters({
        jobSheetNumber,
        companyId: companyId,
        status: 1,
      })
      .getOne();

    if (!data) {
      throw new NotFoundException('Data not found');
    }

    data.apStatus = {};
    data.payables.map(item=>{
      if(!data.apStatus[item.apStatus]) data.apStatus[item.apStatus] = 0;
      data.apStatus[item.apStatus]++;
    })

    return await this.jobSheetRepo.save(data);
  }

  async updateArStatus(jobSheetNumber:string, companyId){
    const data = await this.jobSheetRepo
      .createQueryBuilder('j')
      .leftJoinAndSelect(
        'j.receivables',
        'r',
      )
      .where(
        `
        j.jobSheetNumber = :jobSheetNumber 
        AND j.status = :status
        AND j.companyId = :companyId
      `,
      )
      .setParameters({
        jobSheetNumber,
        companyId: companyId,
        status: 1,
      })
      .getOne();

    if (!data) {
      throw new NotFoundException('Data not found');
    }

    data.arStatus = {};
    data.receivables.map(item=>{
      if(!data.arStatus[item.arStatus]) data.arStatus[item.arStatus] = 0;
      data.arStatus[item.arStatus]++;
    })

    return await this.jobSheetRepo.save(data);
  }

  async updateApExchangeRate(user: CurrentUserDto, jobSheetNumber : string, body: CreateUpdateJobSheetPnlDto[]){
    const { companyId } = user;
    
    const jobSheet = await this.getOneJobSheet({
      jobSheetNumber,
      companyId,
      status:1,
    });
    if (!jobSheet) {
      throw new NotFoundException('Data not found');
    }
    // update currency rate per currency
    var apExchangeRate : object = {};
    if (jobSheet.apExchangeRate){
      apExchangeRate = jobSheet.apExchangeRate;
    }
    body.forEach(el => {
        apExchangeRate[el.currency] = el.exchangeRate;
    });
    jobSheet.apExchangeRate = apExchangeRate;
    return await this.jobSheetRepo.save(jobSheet);
  }

  async shipmentSave(user: CurrentUserDto, jobSheetNumber: string, body: SaveJobSheetShipmentDto) {
    const { userId, companyId, affiliation } = user;

    const jobSheet = await this.jobSheetRepo
      .createQueryBuilder('j')
      .leftJoinAndSelect(
        'j.jobSheetShipment',
        's',
      )
      .where(
        `
        j.jobSheetNumber = :jobSheetNumber 
        AND j.status = :status
        AND j.companyId = :companyId
      `,
      )
      .setParameters({
        jobSheetNumber,
        companyId: companyId,
        status: 1,
      })
      .getOne();

    if(!jobSheet) throw new NotFoundException('Data not found');

    let jobSheetShipment = jobSheet.jobSheetShipment;
    if(!jobSheetShipment){
      jobSheetShipment = await this.jobSheetShipmentRepo.create({
        ...body,
        jobSheetNumber,
        companyId,
        createdByUserId: userId,
      });
    }else{
      Object.assign(jobSheetShipment,{...body})
    }

    return await this.connection.transaction(async (entityManager) => {
      return await entityManager.save(jobSheetShipment);
    });
  }

}
