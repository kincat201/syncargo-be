import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Connection, Repository } from 'typeorm';
import { addDays, endOfMonth, endOfYear, format, getWeek, startOfMonth, startOfYear } from 'date-fns';
import { Workbook } from 'exceljs';
import * as tmp from 'tmp-promise';
import * as numeral from 'numeral';

import {
  Features,
  InvoiceProcess,
  InvoiceStatus,
  JobSheetItemType,
  JobSheetPayableStatus,
  JobSheetReceivableStatus,
  OtifStatus,
  RfqStatus,
  Role,
  ShipmentStatus,
} from 'src/enums/enum';

import { Helper } from 'src/freight-forwarder/helpers/helper';

import { Quotation } from 'src/entities/quotation.entity';
import { Shipment } from 'src/entities/shipment.entity';
import { Invoice } from 'src/entities/invoice.entity';
import { ShipmentOtif } from '../../entities/shipment-otif.entity';
import { Company } from 'src/entities/company.entity';
import { ClaimHistory } from 'src/entities/claim-history.entity';

import { CurrentUserDto } from '../auth/dtos/current-user.dto';
import { EAffiliation } from '../../enums/enum';
import { User } from 'src/entities/user.entity';
import { JobSheet } from '../../entities/job-sheet.entity';
import { JobSheetPayable } from '../../entities/job-sheet-payable.entity';
import { CompanyCurrency } from '../../entities/company-currency.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Quotation) private quotationRepo: Repository<Quotation>,
    @InjectRepository(Shipment) private shipmentRepo: Repository<Shipment>,
    @InjectRepository(Invoice) private invoiceRepo: Repository<Invoice>,
    @InjectRepository(ShipmentOtif) private shipmentOtifRepo: Repository<ShipmentOtif>,
    @InjectRepository(Company) private companyRepo: Repository<Company>,
    @InjectRepository(ClaimHistory) private claimHistoryRepo: Repository<ClaimHistory>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(JobSheet) private jobSheetRepo: Repository<JobSheet>,
    @InjectRepository(JobSheetPayable) private jobSheetPayableRepo: Repository<JobSheetPayable>,
    @InjectRepository(CompanyCurrency) private companyCurrency: Repository<CompanyCurrency>,
    private helper: Helper,
  ) {}

  async getQuotationSummary(user: CurrentUserDto, date: string) {
    const [from, until] = date.split('to');

    const data = await this.quotationRepo
      .createQueryBuilder('q')
      .innerJoin('q.customer', 'c')
      .leftJoin('q.quotationNleCompany', 'qnc', 'qnc.companyId = :companyId')
      .leftJoinAndSelect('q.user', 'u')
      .select([
        'q.id',
        'q.rfqNumber',
        'q.rfqStatus',
        'q.countryFrom',
        'q.countryTo',
        'q.createdAt',
        'c.companyName',
        'u.fullName',
      ])
      .where(
        `
        DATE(q.createdAt) >= :from AND DATE(q.createdAt) <= :until
        AND q.status = :status
        ${
          !['admin', 'manager'].includes(user.role)
            ? 'AND (q.createdByUserId = :userId OR q.updatedByUserId = :userId OR q.rfqStatus = "WAITING_FOR_QUOTATION")'
            : ''
        }
        AND (q.createdByUserId = :userId OR q.updatedByUserId = :userId OR q.companyId = :companyId)
        `,
      )
      .setParameters({
        companyId: user.companyId,
        from,
        until,
        status: 1,
        userId: user.userId,
      })
      .orderBy('q.updatedAt', 'DESC')
      .getMany();

    const rows: any[][] = [
      [
        'no',
        'rfqNumber',
        'date',
        'customerName',
        'origin',
        'destination',
        'status',
        'fullName',
      ],
    ];

    data.forEach((el, i) =>
      rows.push([
        i + 1,
        el.rfqNumber,
        format(el.createdAt, 'dd MMMM yyyy'),
        el.customer.companyName,
        el.countryFrom,
        el.countryTo,
        el.rfqStatus,
        el.user.fullName,
      ]),
    );

    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('Quotation');

    sheet.addRows(rows);
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet
      .getRows(2, rows.length)
      .forEach(
        (row) => (row.alignment = { vertical: 'middle', horizontal: 'left' }),
      );

    sheet.columns = [
      { header: 'No.', key: 'no' },
      { header: 'RFQ Number', key: 'rfqNumber' },
      { header: 'Date', key: 'date' },
      { header: 'Customer Name', key: 'customerName' },
      { header: 'Origin', key: 'origin' },
      { header: 'Destination', key: 'destination' },
      { header: 'Status', key: 'status' },
      { header: 'RFQ Creator', key: 'fullName' },
    ];

    sheet.columns.forEach((column) => {
      let maxLength = 0;
      column['eachCell']({ includeEmpty: true }, function (cell) {
        const columnLength = cell?.value?.toString()?.length ?? 0;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = maxLength + 4;
    });

    const { path: excelFile } = await tmp.file({
      discardDescriptor: true,
      prefix: 'Quotation',
      postfix: '.xlsx',
      mode: parseInt('0600', 8),
    });

    await workbook.xlsx.writeFile(excelFile);
    return excelFile;
  }

  async getShipmentSummary(user: CurrentUserDto, date: string) {
    const [from, until] = date.split('to');

    const data = await this.shipmentRepo
      .createQueryBuilder('s')
      .innerJoin('s.customer', 'c')
      .innerJoin('s.quotation', 'q')
      .select([
        's.otifStatus',
        's.createdAt',
        'c.companyName',
        'q.rfqNumber',
        'q.shipmentService',
        'q.shipmentType',
        'q.countryFrom',
        'q.cityFrom',
        'q.countryTo',
        'q.cityTo',
      ])
      .where(
        `
        DATE(s.createdAt) >= :from AND DATE(s.createdAt) <= :until
        AND q.status = :status
        AND q.companyId = :companyId
        ${
          !['admin', 'manager'].includes(user.role)
            ? 'AND (q.createdByUserId = :userId OR q.updatedByUserId = :userId OR q.rfqStatus = "WAITING_FOR_QUOTATION")'
            : ''
        }
        `,
      )
      .setParameters({
        companyId: user.companyId,
        from,
        until,
        status: 1,
        userId: user.userId,
      })
      .orderBy('s.updatedAt', 'DESC')
      .getMany();

    const rows: any[][] = [
      [
        'no',
        'bookingDate', //s.createdAt
        'rfqNumber',
        'companyName',
        'route',
        'originCountry',
        'destinationCountry',
        'status', // otifStatus
        'shipmentType',
        'incoterms', // shipmentService
      ],
    ];

    data.forEach((el, i) =>
      rows.push([
        i + 1,
        format(el.createdAt, 'dd MMMM yyyy'),
        el.quotation.rfqNumber,
        el.customer.companyName,
        `${el.quotation.cityFrom} to ${el.quotation.cityTo}`,
        el.quotation.countryFrom,
        el.quotation.countryTo,
        el.otifStatus,
        el.quotation.shipmentType,
        el.quotation.shipmentService,
      ]),
    );

    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('Shipment');

    sheet.addRows(rows);
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet
      .getRows(2, rows.length)
      .forEach(
        (row) => (row.alignment = { vertical: 'middle', horizontal: 'left' }),
      );

    sheet.columns = [
      { header: 'No.', key: 'no' },
      { header: 'Booking Date', key: 'bookingDate' },
      { header: 'RFQ Number', key: 'rfqNumber' },
      { header: 'Company Name', key: 'companyName' },
      { header: 'Route', key: 'route' },
      { header: 'Origin Country', key: 'originCountry' },
      { header: 'Destination Country', key: 'destinationCountry' },
      { header: 'Status', key: 'status' },
      { header: 'Shipment Type', key: 'shipmentType' },
      { header: 'Incoterms', key: 'incoterms' },
    ];

    sheet.columns.forEach((column) => {
      let maxLength = 0;
      column['eachCell']({ includeEmpty: true }, function (cell) {
        const columnLength = cell?.value?.toString()?.length ?? 0;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = maxLength + 4;
    });

    const { path: excelFile } = await tmp.file({
      discardDescriptor: true,
      prefix: 'Shipment',
      postfix: '.xlsx',
      mode: parseInt('0600', 8),
    });

    await workbook.xlsx.writeFile(excelFile);
    return excelFile;
  }

  async getIssuedInvoiceSummary(user: CurrentUserDto, date: string, isFinance = false) {
    const [from, until] = date.split('to');

    const data = await this.invoiceRepo
      .createQueryBuilder('i')
      .leftJoin('i.customer', 'c')
      .leftJoin('i.shipment', 's')
      .leftJoin('i.quotation', 'q')
      .leftJoin('i.thirdParties', 'tp')
      .leftJoin('i.jobSheet', 'j')
      .leftJoin('j.jobSheetShipment', 'js')
      .select([
        'i.rfqNumber',
        'i.invoiceNumber',
        'i.jobSheetNumber',
        'c.companyName',
        'tp.companyName',
        'i.dueDate',
        'i.issuedDate',
        'i.total',
        'q.portOfLoading',
        'q.portOfDischarge',
        's.createdAt',
        'q.cityFrom',
        'q.cityTo',
        'q.shipmentService',
        'q.shipmentType',
        'q.countryFrom',
        'q.countryTo',
        'j.jobSheetNumber',
        'js',
      ])
      .where(
        `
        i.invoiceStatus = :invoiceStatus
        AND DATE(i.issuedDate) >= :from AND DATE(i.issuedDate) <= :until
        AND i.status = :status
        ${ !isFinance 
          ? 
          `AND q.companyId = :companyId
            AND s.status = :status
            AND q.status = :status
            ${
            !['admin', 'manager'].includes(user.role)
              ? 'AND (q.createdByUserId = :userId OR q.updatedByUserId = :userId OR q.rfqStatus = :rfqStatus)'
              : ''
            }`
          : 
          `AND i.arStatus IS NOT NULL AND j.companyId = :companyId`}
      `,
      )
      .setParameters({
        invoiceStatus: InvoiceStatus.ISSUED,
        status: 1,
        from,
        until,
        companyId: user.companyId,
        userId: user.userId,
        rfqStatus: RfqStatus.WAITING,
      })
      .orderBy('i.updatedAt', 'DESC')
      .getMany();

    const rows: any[][] = [
      [
        'no',
        'bookingDate',
        !isFinance ? 'rfqNumber' : 'jobSheetNumber',
        'invoiceNumber',
        'customer',
        'route',
        'issuedDate',
        'dueDate',
        'amount',
        'Port Of Loading',
        'Port Of Discharge',
        'Origin Country',
        'Destination Country',
        'Shipment Type',
        'Incoterms',
      ],
    ];

    data.forEach((el, i) =>
      rows.push([
        i + 1,
        !isFinance ? format(el.shipment.createdAt, 'dd MMMM yyyy') : (el.jobSheet.jobSheetShipment ? format(el.jobSheet.jobSheetShipment.createdAt, 'dd MMMM yyyy') : ''),
        !isFinance ? el.rfqNumber : el.jobSheetNumber,
        el.invoiceNumber,
        !isFinance ? el.customer.companyName : (el.thirdParties ? el.thirdParties.companyName : el.customer.companyName),
        !isFinance ? `${el.quotation.cityFrom} to ${el.quotation.cityTo}` : (el.jobSheet.jobSheetShipment ? `${el.jobSheet.jobSheetShipment.cityFrom} to ${el.jobSheet.jobSheetShipment.cityTo}`: ''),
        el.issuedDate ? format(new Date(el.issuedDate), 'dd MMMM yyyy') : '-',
        el.dueDate ? format(new Date(el.dueDate), 'dd MMMM yyyy') : '-',
        numeral(el.total).format('0,0'),
        !isFinance ? el.quotation.portOfLoading : (el.jobSheet.jobSheetShipment ? el.jobSheet.jobSheetShipment.portOfLoading: ''),
        !isFinance ? el.quotation.portOfDischarge : (el.jobSheet.jobSheetShipment ? el.jobSheet.jobSheetShipment.portOfDischarge: ''),
        !isFinance ? el.quotation.countryFrom : (el.jobSheet.jobSheetShipment ? el.jobSheet.jobSheetShipment.countryFrom: ''),
        !isFinance ? el.quotation.countryTo : (el.jobSheet.jobSheetShipment ? el.jobSheet.jobSheetShipment.countryTo: ''),
        !isFinance ? el.quotation.shipmentType : '-',
        !isFinance ? el.quotation.shipmentService : (el.jobSheet.jobSheetShipment ? el.jobSheet.jobSheetShipment.shipmentService: ''),
      ]),
    );

    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('Issued Invoice');

    sheet.addRows(rows);
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet
      .getRows(2, rows.length)
      .forEach(
        (row) => (row.alignment = { vertical: 'middle', horizontal: 'left' }),
      );
    sheet.getColumn(7).alignment = { horizontal: 'right' };

    sheet.columns = [
      { header: 'No.', key: 'no' },
      { header: 'Booking Date', key: 'bookingDate' },
      { header: !isFinance ? 'RFQ Number' : 'Job Sheet Number', key: !isFinance ? 'rfqNumber' : 'jobSheetNumber' },
      { header: 'Invoice Number', key: 'invoiceNumber' },
      { header: 'Company Name', key: 'customer' },
      { header: 'Route', key: 'route' },
      { header: 'Issued Date', key: 'issuedDate' },
      { header: 'Due Date', key: 'dueDate' },
      { header: 'Amount', key: 'amount' },
    ];

    sheet.columns.forEach((column) => {
      let maxLength = 0;
      column['eachCell']({ includeEmpty: true }, function (cell) {
        const columnLength = cell?.value?.toString()?.length ?? 0;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = maxLength + 4;
    });

    const { path: excelFile } = await tmp.file({
      discardDescriptor: true,
      prefix: 'Issued_Invoice',
      postfix: '.xlsx',
      mode: parseInt('0600', 8),
    });

    await workbook.xlsx.writeFile(excelFile);
    return excelFile;
  }

  async getSettledInvoiceSummary(user: CurrentUserDto, date: string, isFinance = false) {
    const [from, until] = date.split('to');

    const data = await this.invoiceRepo
      .createQueryBuilder('i')
      .leftJoin('i.customer', 'c')
      .leftJoin('i.shipment', 's')
      .leftJoin('i.quotation', 'q')
      .leftJoin('i.thirdParties', 'tp')
      .leftJoin('i.jobSheet', 'j')
      .leftJoin('j.jobSheetShipment', 'js')
      .select([
        'i.rfqNumber',
        'i.invoiceNumber',
        'i.jobSheetNumber',
        'c.companyName',
        'i.settledDate',
        'i.settledAmount',
        'q.cityFrom',
        'q.cityTo',
        'q.countryFrom',
        'q.countryTo',
        'q.shipmentType',
        'q.shipmentService',
        'j.jobSheetNumber',
        'js',
      ])
      .where(
        `
        i.invoiceStatus = :invoiceStatus
        AND i.status = :status
        AND DATE(i.settledDate) >= :from AND DATE(i.settledDate) <= :until
        ${ !isFinance 
          ? 
          `AND q.companyId = :companyId
          AND s.status = :status
          AND q.status = :status
          ${
              !['admin', 'manager'].includes(user.role)
                ? 'AND (q.createdByUserId = :userId OR q.updatedByUserId = :userId OR q.rfqStatus = :rfqStatus)'
                : ''
              }` 
          : 
          `AND i.arStatus IS NOT NULL AND j.companyId = :companyId`}
      `,
      )
      .setParameters({
        invoiceStatus: InvoiceStatus.SETTLED,
        status: 1,
        from,
        until,
        companyId: user.companyId,
        userId: user.userId,
        rfqStatus: RfqStatus.WAITING,
      })
      .orderBy('i.updatedAt', 'DESC')
      .getMany();

    const rows: any[][] = [
      ['no', !isFinance ? 'rfqNumber' : 'jobSheetNumber', 'invoiceNumber', 'customer', 'settledDate', 'amount', 'Route', 'Origin Country', 'Destination Country', 'Shipment Type', 'Incoterms'],
    ];

    data.forEach((el, i) =>
      rows.push([
        i + 1,
        !isFinance ? el.rfqNumber : el.jobSheetNumber,
        el.invoiceNumber,
        !isFinance ? el.customer.companyName : (el.thirdParties ? el.thirdParties.companyName : el.customer.companyName),
        format(new Date(el.settledDate), 'dd MMMM yyyy'),
        numeral(el.settledAmount).format('0,0'),
        !isFinance ? `${el.quotation.cityFrom} to ${el.quotation.cityTo}` : (el.jobSheet.jobSheetShipment ? `${el.jobSheet.jobSheetShipment.cityFrom} to ${el.jobSheet.jobSheetShipment.cityTo}`: ''),
        !isFinance ? el.quotation.countryFrom : (el.jobSheet.jobSheetShipment ? el.jobSheet.jobSheetShipment.countryFrom: ''),
        !isFinance ? el.quotation.countryTo : (el.jobSheet.jobSheetShipment ? el.jobSheet.jobSheetShipment.countryTo: ''),
        !isFinance ? el.quotation.shipmentType : '-',
        !isFinance ? el.quotation.shipmentService : (el.jobSheet.jobSheetShipment ? el.jobSheet.jobSheetShipment.shipmentService: ''),
      ]),
    );

    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('Settled Invoice');

    sheet.addRows(rows);
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    if(rows.length > 1){
      sheet
        .getRows(2, rows.length - 1)
        .forEach(
          (row) => (row.alignment = { vertical: 'middle', horizontal: 'left' }),
        );
    }

    sheet.getColumn(6).alignment = { horizontal: 'right' };

    sheet.columns = [
      { header: 'No.', key: 'no' },
      { header: !isFinance ? 'RFQ Number' : 'Job Sheet Number', key: !isFinance ? 'rfqNumber' : 'jobSheetNumber' },
      { header: 'Invoice Number', key: 'invoiceNumber' },
      { header: 'Customer', key: 'customer' },
      { header: 'Settled Date', key: 'settledDate' },
      { header: 'Amount', key: 'amount' },
    ];

    sheet.columns.forEach((column) => {
      let maxLength = 0;
      column['eachCell']({ includeEmpty: true }, function (cell) {
        const columnLength = cell?.value?.toString()?.length ?? 0;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = maxLength + 4;
    });

    const { path: excelFile } = await tmp.file({
      discardDescriptor: true,
      prefix: 'Settled_Invoice',
      postfix: '.xlsx',
      mode: parseInt('0600', 8),
    });

    await workbook.xlsx.writeFile(excelFile);
    return excelFile;
  }

  async getOngoingShipment(currentUser: CurrentUserDto) {
    // Get On Going Shipment
    const getOnGoingShipmentQuery = this.shipmentRepo
      .createQueryBuilder('s')
      .innerJoin('s.quotation', 'q')
      .select([
        's.otifStatus AS otifStatus',
        'q.shipmentService AS shipmentService',
        'q.rfqNumber AS rfqNumber',
        'q.shipmentVia AS shipmentVia',
        'q.countryFrom AS countryFrom',
        'q.countryFromCode AS countryFromCode',
        'q.countryTo AS countryTo',
        'q.countryToCode AS countryToCode',
        's.updatedAt AS updatedAt',
      ])
      .where(
        `${
          currentUser.isTrial
            ? `(q.companyId = :companyId OR q.affiliation = 'DUMMY')`
            : `q.companyId = :companyId`
        }
        AND s.shipmentStatus = :shipmentStatus
        AND s.status = :status
        AND q.status = :status
        ${
          !['admin', 'manager'].includes(currentUser.role)
            ? 'AND (q.createdByUserId = :userId OR q.updatedByUserId = :userId OR q.rfqStatus = "WAITING_FOR_QUOTATION")'
            : ''
        }
        `,
        {
          companyId: currentUser.companyId,
          status: 1,
          shipmentStatus: ShipmentStatus.ONGOING,
          userId: currentUser.userId,
        },
      )
      .orderBy('s.updatedAt', 'DESC');

    const onGoingShipmentTotal = await getOnGoingShipmentQuery.getCount();
    const onGoingShipment = await getOnGoingShipmentQuery.limit(5).getRawMany();

    onGoingShipment.forEach((el) => {
      el['otifProgressPercentage'] = this.helper.getProgressionPercentage(
        el.shipmentService,
        el.otifStatus,
        true,
      );
      delete el.shipmentService;
    });

    return { onGoingShipmentTotal, onGoingShipment };
  }

  async getNewRequestQuotation(currentUser: CurrentUserDto) {
    // Get New Request Quotation
    const newRequestData = await this.quotationRepo
      .createQueryBuilder('q')
      .innerJoin('q.customer', 'c')
      .leftJoin('q.quotationNleCompany', 'qnc')
      .leftJoin('q.bids', 'b', 'b.companyId = :companyId')
      .select([
        'c.companyName AS companyName',
        'q.rfqNumber AS rfqNumber',
        'q.shipmentVia AS shipmentVia',
        'q.countryFrom AS countryFrom',
        'q.countryFromCode AS countryFromCode',
        'q.countryTo AS countryTo',
        'q.countryToCode AS countryToCode',
        'q.createdAt AS createdAt',
        'q.updatedAt AS updatedAt',
        'q.affiliation AS affiliation',
        `IF(b.rfqStatus IS NULL AND q.rfqStatus NOT IN ("CANCELLED", "REJECTED"), "${RfqStatus.WAITING}", b.rfqStatus) AS rfqStatus`,
      ])
      .where(
        `
        q.status = :status
        AND (
          (q.affiliation = :affiliation AND qnc.companyId = :companyId AND qnc.status = :status)
          OR (q.affiliation != :affiliation AND q.rfqStatus = :rfqStatus AND (c.companyId = :companyId OR c.affiliation = :affiliation))
          ${currentUser.isTrial ? `OR (q.affiliation = 'DUMMY')` : ``}
        )
        ${
          !['admin', 'manager'].includes(currentUser.role)
            ? 'AND (q.createdByUserId = :userId OR q.updatedByUserId = :userId OR q.rfqStatus = "WAITING_FOR_QUOTATION")'
            : ''
        }
        `,
        {
          affiliation: 'NLE',
          companyId: currentUser.companyId,
          rfqStatus: RfqStatus.WAITING,
          status: 1,
          userId: currentUser.userId,
        },
      )
      .limit(4)
      .orderBy('q.createdAt', 'DESC')
      .getRawMany();

      

    return newRequestData;
  }

  async getOnGoingQuotations(currentUser: CurrentUserDto, limit: number) {
    // Get New Request Quotation
    const newRequestData = await this.quotationRepo
      .createQueryBuilder('q')
      .innerJoin('q.customer', 'c')
      .leftJoin('q.quotationNleCompany', 'qnc')
      .leftJoin('q.bids', 'b', 'b.companyId = :companyId')
      .select([
        'c.companyName AS companyName',
        'q.rfqNumber AS rfqNumber',
        'q.shipmentVia AS shipmentVia',
        'q.countryFrom AS countryFrom',
        'q.countryFromCode AS countryFromCode',
        'q.countryTo AS countryTo',
        'q.countryToCode AS countryToCode',
        'q.createdAt AS createdAt',
        'q.updatedAt AS updatedAt',
        'q.rfqStatus AS rfqStatus',
        'q.affiliation AS affiliation',
      ])
      .where(
        `
        q.status = :status
        AND (
          (q.affiliation = :affiliation AND qnc.companyId = :companyId AND qnc.status = :status AND q.rfqStatus IN (:...rfqStatus) )
          OR (q.affiliation != :affiliation AND q.rfqStatus IN (:...rfqStatus) AND (c.companyId = :companyId OR c.affiliation = :affiliation))
          ${currentUser.isTrial ? `OR (q.affiliation = 'DUMMY')` : ``}
        )
        ${
          !['admin', 'manager'].includes(currentUser.role)
            ? 'AND (q.createdByUserId = :userId OR q.updatedByUserId = :userId OR q.rfqStatus = "WAITING_FOR_QUOTATION")'
            : ''
        }
        `,
        {
          affiliation: 'NLE',
          companyId: currentUser.companyId,
          rfqStatus: [RfqStatus.DRAFT, RfqStatus.WAITING, RfqStatus.SUBMITTED],
          status: 1,
          userId: currentUser.userId,
        },
      )
      .limit(limit)
      .orderBy('q.createdAt', 'DESC')
      .getRawMany();

    return newRequestData;
  }

  async getSnapshot(currentUser: CurrentUserDto, limit?: number) {
    const company = await this.companyRepo.findOne({
      where: [
        { id: currentUser.companyId, status: 1 },
        { affiliation: EAffiliation.DUMMY, status: 1 },
      ],
      select: ['shipmentQuota'],
    });
    let result;
    if (currentUser.companyFeatureIds.includes(Features.ALL_FEATURES)) {
      result = {
        newRequestQuotation: await this.getNewRequestQuotation(currentUser),
        onGoingShipment: await this.getOngoingShipment(currentUser),
        latestInvoice: await this.getLatestInvoices(currentUser),
        shipmentQuota: company.shipmentQuota,
        syncargoReward: await this.getReward(currentUser),
      };
    } else if (currentUser.companyFeatureIds.includes(Features.CRM)) {
      if (!limit) limit = 5;
      result = {
        onGoingQuotation: await this.getOnGoingQuotations(currentUser, limit),
      };
    } else if (currentUser.companyFeatureIds.includes(Features.TMS)) {
      result = {
        onGoingShipment: await this.getOngoingShipment(currentUser),
      };
    }

    return result;
  }

  async getLatestInvoices(currentUser: CurrentUserDto) {
    // Get Latest Invoices
    const getLatestInvoices = await this.invoiceRepo
      .createQueryBuilder('i')
      .innerJoin('i.quotation', 'q')
      .select([
        'q.rfqNumber AS rfqNumber',
        'q.shipmentVia AS shipmentVia',
        'i.invoiceNumber AS invoiceNumber',
        'i.invoiceStatus AS invoiceStatus',
        'i.invoiceProcess AS status',
        `IF (
          i.dueDate IS NOT NULL,
          CURDATE() > DATE(i.dueDate),
          FALSE
        ) AS overdue`,
        'q.countryFrom AS countryFrom',
        'q.countryFromCode AS countryFromCode',
        'q.countryTo AS countryTo',
        'q.countryToCode AS countryToCode',
        'i.createdAt AS createdAt',
        'i.updatedAt AS updatedAt',
      ])
      .where(
        `
        i.invoiceProcess IN (:...invoiceProcess)
        ${
          currentUser.isTrial
            ? `AND (q.companyId = :companyId OR q.affiliation = 'DUMMY')`
            : `AND q.companyId = :companyId`
        }
        AND i.status = :status
        AND q.status = :status
        ${
          !['admin', 'manager'].includes(currentUser.role)
            ? 'AND (q.createdByUserId = :userId OR q.updatedByUserId = :userId OR q.rfqStatus = "WAITING_FOR_QUOTATION")'
            : ''
        }
      `,
      )
      .setParameters({
        invoiceProcess: [
          InvoiceProcess.WAITING_APPROVAL,
          InvoiceProcess.NEED_REVISION,
          InvoiceProcess.PENDING,
          InvoiceProcess.WAITING_CONFIRMATION,
        ],
        companyId: currentUser.companyId,
        status: 1,
        userId: currentUser.userId,
      })
      .limit(4)
      .orderBy('updatedAt', 'DESC')
      .getRawMany();

    return getLatestInvoices;
  }

  async getReward(currentUser: CurrentUserDto) {
    const hasBeenClaimed = await this.claimHistoryRepo
      .createQueryBuilder('ch')
      .where(
        `
        ch.companyId = :companyId
        AND ch.ffUserId = :userId
        AND ch.createdByUserId = :userId
        AND MONTH(ch.createdAt) = MONTH(CURDATE())
        AND YEAR(ch.createdAt) = YEAR(CURDATE())
        AND ch.status = :status
      `,
      )
      .setParameters({
        companyId: currentUser.companyId,
        userId: currentUser.userId,
        status: 1,
      })
      .getCount();

    // if reward has been claimed, return 0 in order to cannot claim anymore until next month
    if (hasBeenClaimed) return 0;

    const shipmentQuery = await this.shipmentOtifRepo
      .createQueryBuilder('so')
      .innerJoin('so.shipment', 's')
      .innerJoin('s.quotation', 'q')
      .where(
        `
        so.otifStatus = :otifStatus
        AND s.shipmentStatus = :shipmentStatus
        AND s.otifStatus = :otifStatus
        AND MONTH(so.createdAt) = MONTH(CURDATE())
        AND YEAR(so.createdAt) = YEAR(CURDATE())
        AND q.companyId = :companyId
        AND so.status = :status
        AND s.status = :status
        AND q.status = :status
        AND (q.updatedByUserId = :userId OR q.createdByUserId = :userId OR q.acceptedByUserId = :userId)

      `,
      )
      .select(
        `q.updatedByUserId AS updateBy, q.createdByUserId AS createdBy, q.acceptedByUserId AS acceptedBy`,
      )
      .setParameters({
        companyId: currentUser.companyId,
        userId: currentUser.userId,
        shipmentStatus: ShipmentStatus.COMPLETE,
        otifStatus: OtifStatus.COMPLETE,
        status: 1,
      })
      .getRawMany();

    // for making reward point per user
    let createdByIds = [];
    let totalShipment = 0;
    shipmentQuery.forEach((shipment) => {
      createdByIds.push(shipment.createdBy);
    });

    const uQuery = await this.userRepo
      .createQueryBuilder('u')
      .select('u.userId AS userId')
      .where('u.role IN (:...role)', { role: ['admin', 'staff', 'manager'] });

    if (createdByIds.length > 0) {
      uQuery.andWhere('u.userId IN (:...id)', { id: createdByIds });
    }

    const userQuery = await uQuery.getRawMany();

    shipmentQuery.forEach((shipment) => {
      if (shipment.createdBy == currentUser.userId) {
        totalShipment += 1;
      } else if (
        shipment.acceptedBy == currentUser.userId &&
        userQuery.findIndex((user) => user.userId == shipment.createdBy) == -1
      ) {
        totalShipment += 1;
      }
    });

    return totalShipment > 10 ? 10 : totalShipment;
  }

  async getShipmentCalendar(
    currentUser: CurrentUserDto,
    view,
    weekNumber = null,
    page,
    date = null,
  ) {
    const offset = 4 * (page - 1);

    if (!weekNumber) weekNumber = getWeek(new Date()).toString();
    const dateRange = this.helper.getCurrentWeek(weekNumber);

    let from = dateRange[0];
    let until = dateRange[1];

    if (date) {
      from = new Date(date);
      until = new Date(date);
    }

    const result = [];
    let currentDate = from;
    while (currentDate <= until) {
      result.push({
        date: format(currentDate, 'yyyy-MM-dd'),
        total: 0,
        list: [],
      });

      // Get OnGoing Shipment
      const getShipmentQuery = await this.shipmentOtifRepo
        .createQueryBuilder('so')
        .innerJoin('so.shipment', 's')
        .innerJoin('s.quotation', 'q')
        .select([
          'q.rfqNumber',
          'q.shipmentVia',
          'q.countryFrom',
          'q.countryFromCode',
          'q.countryTo',
          'q.countryToCode',
          's.rfqNumber',
          'so.etd',
          'so.eta',
          'so.updatedAt',
        ])
        .where(
          `${
            currentUser.isTrial
              ? `(q.companyId = :companyId OR q.affiliation = 'DUMMY')`
              : `q.companyId = :companyId`
          }
          AND so.otifStatus = :otifStatus
          AND so.status = :status
          AND s.status = :status
          AND q.status = :status
          ${
            !['admin', 'manager'].includes(currentUser.role)
              ? 'AND (q.createdByUserId = :userId OR q.updatedByUserId = :userId OR q.rfqStatus = "WAITING_FOR_QUOTATION")'
              : ''
          }
          `,
          {
            companyId: currentUser.companyId,
            status: 1,
            otifStatus: OtifStatus.SCHEDULED,
            userId: currentUser.userId,
          },
        )
        .andWhere(`DATE(so.${view}) = :currentDate`, {
          currentDate: format(new Date(currentDate), 'yyyy-MM-dd'),
        })
        .orderBy('so.updatedAt', 'DESC');

      const getTotalShipment = await getShipmentQuery.getCount();
      const getShipment = await getShipmentQuery
        .limit(4)
        .offset(offset)
        .getMany();

      getShipment.map((item) => {
        const indexOfResult = result.findIndex(
          (x) =>
            x.date ==
            format(new Date(view == 'etd' ? item.etd : item.eta), 'yyyy-MM-dd'),
        );
        if (indexOfResult !== -1) {
          result[indexOfResult].total = getTotalShipment;
          result[indexOfResult].list.push({
            rfqNumber: item.shipment.quotation.rfqNumber,
            shipmentVia: item.shipment.quotation.shipmentVia,
            etd: item.etd,
            eta: item.eta,
            countryFrom: item.shipment.quotation.countryFrom,
            countryFromCode: item.shipment.quotation.countryFromCode,
            countryTo: item.shipment.quotation.countryTo,
            countryToCode: item.shipment.quotation.countryToCode,
            updatedAt: item.updatedAt,
          });
        }
      });

      currentDate = addDays(currentDate, 1);
    }

    return {
      weekNumber,
      list: result,
    };
  }

  async getJobSheetList(currentUser: CurrentUserDto) {

    const jobSheetData = await this.jobSheetRepo
      .createQueryBuilder('j')
      .innerJoin('j.customer', 'c')
      .select([
        'j.jobSheetNumber AS jobSheetNumber',
        'j.itemType AS itemType',
        'j.arStatus AS arStatus',
        'j.apStatus AS apStatus',
        'j.createdAt AS createdAt',
        'j.updatedAt AS updatedAt',
        'c.companyName AS companyName',
      ])
      .where(
        `
        j.status = :status
        ${
          currentUser.isTrial
            ? `AND (j.companyId = :companyId OR j.affiliation = 'DUMMY')`
            : `AND j.companyId = :companyId`
          }
        AND c.status = :status
      `,
      )
      .setParameters({
        companyId: currentUser.companyId,
        status: 1,
      })
      .orderBy('updatedAt', 'DESC');

    const requiredActionList = [];

    const filterRequiredActionList = {
      AR:[
        JobSheetReceivableStatus.APPROVED,
        JobSheetReceivableStatus.PENDING,
        JobSheetReceivableStatus.PARTIALLY_PAID,
      ],
      AP:[
        JobSheetReceivableStatus.APPROVED,
        JobSheetReceivableStatus.PARTIALLY_PAID,
      ],
    }

    if([Role.MANAGER,Role.ADMIN].includes(<Role> currentUser.role)){
      filterRequiredActionList.AR.push(JobSheetReceivableStatus.WAITING_APPROVAL);
      filterRequiredActionList.AP.push(JobSheetReceivableStatus.WAITING_APPROVAL);
    }else{
      filterRequiredActionList.AR.push(JobSheetReceivableStatus.REJECTED);
      filterRequiredActionList.AP.push(JobSheetReceivableStatus.REJECTED);
    }

    const jobSheetReceivableData = await this.invoiceRepo
      .createQueryBuilder('i')
      .innerJoin('i.jobSheet','j')
      .leftJoin('i.customer','c')
      .leftJoin('i.thirdParties', 'tp')
      .select([
        'i.id',
        'i.jobSheetNumber',
        'i.invoiceNumber',
        'i.invoiceStatus',
        'i.arStatus',
        'i.createdAt',
        'i.updatedAt',
        'c.companyName',
        'tp.companyName',
      ])
      .where(`
        i.status = :status
        AND j.status = :status
        AND j.companyId = :companyId
        AND i.arStatus IN (:arStatus)
      `,{
        status:1,
        companyId : currentUser.companyId,
        arStatus: filterRequiredActionList.AR,
      })
      .orderBy('i.updatedAt','DESC')
      .limit(5)
      .getMany();

    jobSheetReceivableData.map(item=>{
      requiredActionList.push({
        id: item.id,
        jobSheetNumber: item.jobSheetNumber,
        type: JobSheetItemType.AR,
        invoiceNumber: item.invoiceNumber,
        invoiceStatus: item.invoiceStatus,
        companyName: item.thirdParties ? item.thirdParties.companyName : item.customer.companyName,
        arStatus: item.arStatus,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })
    });

    const jobSheetPayableData = await this.jobSheetPayableRepo
      .createQueryBuilder('p')
      .innerJoin('p.jobSheet','j')
      .select([
        'p.invoiceNumber',
        'p.id',
        'p.jobSheetNumber',
        'p.vendorName',
        'p.apStatus',
        'p.createdAt',
        'p.updatedAt',
      ])
      .where(`
        p.status = :status
        AND p.status = :status
        AND j.companyId = :companyId
        AND p.apStatus IN (:apStatus)
      `,{
        status:1,
        companyId : currentUser.companyId,
        apStatus: filterRequiredActionList.AP
      })
      .orderBy('p.updatedAt','DESC')
      .limit(5)
      .getMany();

    jobSheetPayableData.map(item=>{
      requiredActionList.push({
        id: item.id,
        jobSheetNumber: item.jobSheetNumber,
        type: JobSheetItemType.AP,
        invoiceNumber: item.invoiceNumber,
        companyName: item.vendorName,
        apStatus: item.apStatus,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })
    });

    requiredActionList.sort((a, b) => {
      return b.updatedAt - a.updatedAt;
    });

    const jobSheetList = await jobSheetData.limit(5).getRawMany();

    jobSheetList.map(item =>{
      this.helper.appendJobSheetStatus(item);
    });

    return {
      total: await jobSheetData.getCount(),
      requiredActionList: requiredActionList.slice(0,5),
      jobSheetList,
    };
  }

  async getProfitLossSummary(user: CurrentUserDto, date: string) {
    const [from, until] = date.split('to');

    const receivables = await this.invoiceRepo
      .createQueryBuilder('i')
      .innerJoinAndSelect(
        'i.jobSheet',
        'j',
      )
      .where(
        `
        i.status = :status
        AND ((DATE(i.dueDate) >= :from AND DATE(i.dueDate) <= :until) OR i.dueDate is null)
        AND i.arStatus NOT IN (:arStatus)
        AND j.status = :status
        AND (${ !user.isTrial ? `j.companyId = :companyId` : `j.affiliation = :dummyAffiliation`})
      `,
      )
      .select([
        'i.invoiceNumber',
        'i.jobSheetNumber',
        'i.dueDate',
        'i.total',
        'i.totalCurrency',
        'i.remainingAmount',
        'i.remainingAmountCurrency',
        'i.currency',
        'i.exchangeRate',
        'i.arStatus'
      ])
      .setParameters({
        arStatus:[JobSheetReceivableStatus.WAITING_APPROVAL, JobSheetReceivableStatus.REJECTED],
        companyId: user.companyId,
        from,
        until,
        dummyAffiliation: EAffiliation.DUMMY,
        status: 1,
      })
      .orderBy('i.jobSheetNumber','ASC')
      .getMany();

    const mergeRowTotal = {};
    let result = [];

    const rows: any[][] = [
      ['Jobsheet No.', 'Invoice No.','Invoice Due Date','Currency','Exchange','Type','Value','Profit and Loss'],
    ];

    receivables.forEach((el, i) => {

      if(!mergeRowTotal[el.jobSheetNumber]) mergeRowTotal[el.jobSheetNumber] = {total: 0};
      mergeRowTotal[el.jobSheetNumber].total += Number(el.total);

      result.push([
        el.jobSheetNumber,
        el.invoiceNumber,
        format(new Date(el.dueDate), 'dd/MM/yyyy'),
        el.currency,
        el.currency != 'IDR' ? this.helper.setThousand(el.exchangeRate) : '',
        'AR',
        this.helper.setThousand(el.total),
        this.helper.setThousand(el.total),
      ]);
    });

    const payables = await this.jobSheetPayableRepo
      .createQueryBuilder('p')
      .innerJoinAndSelect(
        'p.jobSheet',
        'j',
      )
      .where(
        `
        p.status = :status
        AND DATE(p.dueDate) >= :from AND DATE(p.dueDate) <= :until
        AND p.apStatus IN (:apStatus)
        AND p.status = :status
        AND (${ !user.isTrial ? `j.companyId = :companyId` : `j.affiliation = :dummyAffiliation`})
      `,
      )
      .select([
        'p.invoiceNumber',
        'p.jobSheetNumber',
        'p.dueDate',
        'p.amountDue',
        'j.apExchangeRate',
        'p.apStatus'
      ])
      .setParameters({
        apStatus:[JobSheetPayableStatus.APPROVED,JobSheetPayableStatus.PARTIALLY_PAID,JobSheetPayableStatus.PAID],
        companyId: user.companyId,
        from,
        until,
        dummyAffiliation: EAffiliation.DUMMY,
        status: 1,
      })
      .orderBy('p.jobSheetNumber','ASC')
      .getMany();

    payables.map((el,i)=>{

      const currency = [];
      const exchangeRate = [];
      let totalAp = 0;
      let isIdr = true;

      if(el.jobSheet?.apExchangeRate){
        Object.keys(el.jobSheet?.apExchangeRate).forEach(key1 =>{
          exchangeRate.push(key1+' : '+this.helper.setThousand(el.jobSheet?.apExchangeRate[key1]));
        });
      }

      if(el.amountDue){
        Object.keys(el.amountDue).forEach(key => {
          currency.push(key);
          if(key == 'IDR'){
            totalAp += Number(el.amountDue[key]);
          }else{
            isIdr = false;
            if(el.jobSheet?.apExchangeRate[key]){
              totalAp += Number(el.amountDue[key]) * el.jobSheet.apExchangeRate[key];
            }
          }
        });
      }

      if(!mergeRowTotal[el.jobSheetNumber]) mergeRowTotal[el.jobSheetNumber] = {total: 0};

      mergeRowTotal[el.jobSheetNumber].total -= Number(totalAp);

      result.push([
        el.jobSheetNumber,
        el.invoiceNumber,
        format(new Date(el.dueDate), 'dd/MM/yyyy'),
        currency.join('|'),
        !isIdr ? exchangeRate.join('|') : '',
        'AP',
        this.helper.setThousand(totalAp),
        this.helper.setThousand((totalAp*-1)),
      ]);
    });

    result.sort((a, b) => {
      return Number(a[0].split('/').pop()) - Number(b[0].split('/').pop());
    });

    result.map((el,i)=>{
      if(!mergeRowTotal[el[0]].min){
        mergeRowTotal[el[0]].min = (i+2);
      }else{
        mergeRowTotal[el[0]].max = (i+2);
      }

      rows.push(el);
    });

    //console.log(result);
    //console.log(mergeRowTotal);

    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('Profit & Loss');

    sheet.addRows(rows);
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    if(rows.length > 1){
      sheet
        .getRows(2, rows.length - 1)
        .forEach(
          (row) => (row.alignment = { vertical: 'middle', horizontal: 'left' }),
        );
    }

    sheet.getColumn(6).alignment = { horizontal: 'right' };

    sheet.columns = [
      { header: 'Jobsheet No.', key: 'jobSheetNumber' },
      { header: 'Invoice No.', key: 'invoiceNumber' },
      { header: 'Invoice Due Date', key: 'dueDate' },
      { header: 'Currency', key: 'currency' },
      { header: 'Exchange', key: 'exchangeRate' },
      { header: 'Type', key: 'type' },
      { header: 'Value', key: 'total' },
      { header: 'Profit and Loss', key: 'total' },
    ];

    Object.keys(mergeRowTotal).forEach(key =>{
      if(mergeRowTotal[key].max){
        sheet.mergeCells('H'+mergeRowTotal[key].min+':H'+mergeRowTotal[key].max);
        sheet.getCell('H'+mergeRowTotal[key].min).value = this.helper.setThousand(mergeRowTotal[key].total);//numeral(mergeRowTotal[key].total).format('0,0');
        sheet.getCell('H'+mergeRowTotal[key].min).alignment  = { vertical: 'middle', horizontal: 'left' };
      }
    })

    sheet.columns.forEach((column) => {
      let maxLength = 0;
      column['eachCell']({ includeEmpty: true }, function (cell) {
        const columnLength = cell?.value?.toString()?.length ?? 0;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = maxLength + 4;
    });

    const { path: excelFile } = await tmp.file({
      discardDescriptor: true,
      prefix: 'Profit_Loss',
      postfix: '.xlsx',
      mode: parseInt('0600', 8),
    });

    await workbook.xlsx.writeFile(excelFile);
    return excelFile;
  }

  async getAllStageReport(currentUser: CurrentUserDto, date: string) {

    const from = startOfMonth(new Date(date));
    const until = endOfMonth(new Date(date));

    const datas = await this.quotationRepo
      .createQueryBuilder('q')
      .innerJoin('q.customer', 'c')
      .innerJoin('q.user', 'u')
      .select([
        'u.id as userId',
        'u.fullName AS fullName',
        'COUNT(q.id) as total',
        'q.rfqStatus as rfqStatus',
        'q.createdAt AS createdAt',
      ])
      .where(
        `
        q.status = :status
        AND (DATE(q.createdAt) >= :from AND DATE(q.createdAt) <= :until)
        AND (
          (q.rfqStatus IN (:...rfqStatus) AND (c.companyId = :companyId))
          ${currentUser.isTrial ? `OR (q.affiliation = 'DUMMY')` : ``}
        )
        ${
          !['admin', 'manager'].includes(currentUser.role)
            ? 'AND (q.createdByUserId = :userId OR q.updatedByUserId = :userId)'
            : ''
          }
        `,
        {
          companyId: currentUser.companyId,
          rfqStatus: [
            RfqStatus.DRAFT,
            RfqStatus.WAITING,
            RfqStatus.SUBMITTED,
            RfqStatus.COMPLETED
          ],
          from,
          until,
          status: 1,
          userId: currentUser.userId,
        },
      )
      .orderBy('q.createdAt', 'DESC')
      .groupBy('q.createdByUserId')
      .addGroupBy('q.rfqStatus')
      .getRawMany();

    const getCountSales = {};
    datas.map(item=>{
      if(getCountSales[item.userId]) getCountSales[item.userId] = 0;
      getCountSales[item.userId] += Number(item.total);
    });

    const sortableSales = Object.keys(getCountSales).sort(function(a,b){return getCountSales[b] - getCountSales[a]});

    const result = [];

    for (const index in sortableSales){
      if(Number(index) > 2) {
        result.push({
          id:0,
          name:'Others',
          data:[0,0,0]
        })
        break;
      }else{
        result.push({
          id:sortableSales[index],
          name:'Sales '+index,
          data:[0,0,0]
        })
      }
    }

    for (const data of datas){
      let indexResult = result.findIndex( x => x.id == data.userId);
      if(indexResult === -1){
        indexResult = result.length - 1;
      }else{
        result[indexResult].name = data.fullName;
      }

      if([RfqStatus.DRAFT].includes(data.rfqStatus)){
        result[indexResult].data[0] += Number(data.total);
      }else if([RfqStatus.WAITING,RfqStatus.SUBMITTED].includes(data.rfqStatus)){
        result[indexResult].data[1] += Number(data.total);
      }else if([RfqStatus.COMPLETED].includes(data.rfqStatus)){
        result[indexResult].data[2] += Number(data.total);
      }
    }

    return result;
  }

  async getRevenueReport(currentUser: CurrentUserDto, date: string) {

    const from = startOfYear(new Date(date));
    const until = endOfYear(new Date(date));

    const datas = await this.quotationRepo
      .createQueryBuilder('q')
      .leftJoin('q.bids', 'b', !currentUser.isTrial? `b.companyId = :companyId OR b.companyId IS NULL`: ``)
      .leftJoin('b.bidprices', 'bp')
      .innerJoin('q.customer', 'c')
      .select([
        'q.id',
        'q.affiliation',
        'q.rfqStatus',
        'q.createdAt',
        'b.rfqStatus',
        'b.vendorName',
        'b.currency',
        'b.companyId',
        'bp.total',
      ])
      .where(
        `
        q.status = :status
        AND (DATE(q.createdAt) >= :from AND DATE(q.createdAt) <= :until)
        AND (
          (q.rfqStatus IN (:...rfqStatus) AND (c.companyId = :companyId))
          ${currentUser.isTrial ? `OR (q.affiliation = 'DUMMY')` : ``}
        )
        ${
          !['admin', 'manager'].includes(currentUser.role)
            ? 'AND (q.createdByUserId = :userId OR q.updatedByUserId = :userId)'
            : ''
          }
        `,
        {
          companyId: currentUser.companyId,
          rfqStatus: [
            RfqStatus.COMPLETED
          ],
          from,
          until,
          status: 1,
          userId: currentUser.userId,
        },
      )
      .orderBy('q.createdAt', 'DESC')
      .getMany();

    const companyCurrency = await this.companyCurrency
      .createQueryBuilder('c')
      .select([
        'c.name',
        'c.exchangeRate'
      ])
      .where(`c.status = :status AND c.companyId = :companyId`,{
        status:1,
        companyId: currentUser.companyId,
      })
      .getMany();

    const exchangeRate = {};

    companyCurrency.map(item=>{
      exchangeRate[item.name] = item.exchangeRate;
    })

    const result = [{
      name:'Revenue',
      data:[0,0,0,0,0,0,0,0,0,0,0,0]
    }];

    for (const data of datas){
      let subtotal = 0;
      let currency = 'IDR';

      if (data.affiliation != 'NLE') {
        subtotal =
          data.bids[0]?.bidprices?.reduce(
            (acc, el) => acc + Number(el.total),
            0,
          ) ?? 0;

        currency = data.bids[0].currency;
      } else {
        data.bids.map((item) => {
          if (item.companyId == currentUser.companyId) {
            subtotal =
              item?.bidprices?.reduce((acc, el) => acc + Number(el.total), 0) ??
                0;
            currency = item.currency;
          }
        });
      }

      // calculate revenue
      if(exchangeRate[currency] && currency != 'IDR'){
        subtotal = subtotal * exchangeRate[currency];
      }

      const month = format(data.createdAt,'M');
      result[0].data[(Number(month)-1)] += Number(subtotal);
    }

    return result;
  }

  async getPipeLine(currentUser: CurrentUserDto, date: string, salesId: number) {

    const from = startOfMonth(new Date(date));
    const until = endOfMonth(new Date(date));

    const datas = await this.quotationRepo
      .createQueryBuilder('q')
      .leftJoin('q.bids', 'b', !currentUser.isTrial? `b.companyId = :companyId OR b.companyId IS NULL`: ``)
      .leftJoin('b.bidprices', 'bp')
      .leftJoin('q.user', 'u')
      .innerJoin('q.customer', 'c')
      .leftJoin('q.quotationRevenueHistories', 'qrh',`qrh.status = :status`)
      .select([
        'q.id',
        'q.affiliation',
        'q.rfqStatus',
        'q.createdAt',
        'q.shipmentVia',
        'q.rfqNumber',
        'q.cityFrom',
        'q.cityTo',
        'q.createdByUserId',
        'q.revenueNote',
        'u.fullName',
        'c.companyName',
        'b.rfqStatus',
        'b.vendorName',
        'b.currency',
        'b.companyId',
        'bp.total',
        'qrh.action',
        'qrh.createdAt'
      ])
      .where(
        `
        q.status = :status
        AND (DATE(q.createdAt) >= :from AND DATE(q.createdAt) <= :until)
        AND (
          (q.rfqStatus IN (:...rfqStatus) AND (c.companyId = :companyId))
          ${currentUser.isTrial ? `OR (q.affiliation = 'DUMMY')` : ``}
        )
        ${
          !['admin', 'manager'].includes(currentUser.role) || salesId
            ? 'AND (q.createdByUserId = :userId OR q.updatedByUserId = :userId)'
            : ''
          }
        `,
        {
          companyId: currentUser.companyId,
          rfqStatus: [
            RfqStatus.DRAFT,
            RfqStatus.WAITING,
            RfqStatus.SUBMITTED,
            RfqStatus.COMPLETED,
            RfqStatus.REJECTED,
            RfqStatus.CANCELLED,
          ],
          from,
          until,
          status: 1,
          userId: salesId ? salesId : currentUser.userId,
        },
      )
      .orderBy('q.createdAt', 'DESC')
      .getMany();

    const getAllSales = await this.userRepo
      .createQueryBuilder('u')
      .innerJoinAndSelect('u.menus', 'm','m.id IN (:salesPermission)')
      .select([
        'u.userId AS userId',
        'u.fullName AS fullName',
        'u.revenueTarget as revenueTarget',
        '0 AS totalProgress',
        '0 AS totalProgressPercentage',
        '0 AS proposition',
        '0 AS negotiation',
        '0 AS won',
      ])
      .where(`u.status = :status AND u.companyId = :companyId`,{
        status:1,
        companyId: currentUser.companyId,
        salesPermission:[1,3,41]
      })
      .groupBy('u.userId')
      .getRawMany();

    const companyCurrency = await this.companyCurrency
      .createQueryBuilder('c')
      .select([
        'c.name',
        'c.exchangeRate'
      ])
      .where(`c.status = :status`,{
        status:1,
        companyId: currentUser.companyId,
      })
      .getMany();

    const exchangeRate = {};

    companyCurrency.map(item=>{
      exchangeRate[item.name] = item.exchangeRate;
    })

    const result = {
      salesList: [
        {
          userId:0,
          fullName: 'All User',
          revenueTarget: 0,
          totalProgress: 0,
          totalProgressPercentage: '0.00%',
          proposition: '0.00%',
          negotiation: '0.00%',
          won: '0.00%',
        }
      ],
      list:{
        proposition:[],
        negotiation:[],
        won:[],
        loss:[],
      }
    };

    const salesReportData = {};

    for (const data of datas){

      if(!salesReportData[data.createdByUserId]){
        salesReportData[data.createdByUserId] = {
          proposition:0,
          negotiation:0,
          won:0,
          total:0,
        }
      }

      let subtotal = 0;
      let currency = 'IDR';

      if (data.affiliation != 'NLE') {
        subtotal =
          data.bids[0]?.bidprices?.reduce(
            (acc, el) => acc + Number(el.total),
            0,
          ) ?? 0;

        if(data.bids.length > 0 && data.bids[0].currency ) currency = data.bids[0].currency;

      } else {
        data.rfqStatus = RfqStatus.WAITING;
        data.bids.map((item) => {
          if (item.companyId == currentUser.companyId) {
            subtotal =
              item?.bidprices?.reduce((acc, el) => acc + Number(el.total), 0) ??
                0;
            currency = item.currency;
          }
        });
      }

      // calculate revenue
      if(exchangeRate[currency] && currency != 'IDR'){
        subtotal = subtotal * exchangeRate[currency];
      }

      const item = {
        salesId: data.createdByUserId,
        cityFrom: data.cityFrom,
        cityTo: data.cityTo,
        shipmentVia: data.shipmentVia,
        companyName: data.customer?.companyName,
        subtotal: subtotal,
        creator: data.user?.fullName,
        rfqNumber: data.rfqNumber,
        revenueNote: data.revenueNote,
        revenueHistories: data.quotationRevenueHistories ? data.quotationRevenueHistories : [],
      }

      if([RfqStatus.DRAFT].includes(data.rfqStatus)){
        result.list.proposition.push(item);
        salesReportData[data.createdByUserId].proposition += Number(subtotal);
        salesReportData[data.createdByUserId].total += Number(subtotal);
      }else if([RfqStatus.WAITING,RfqStatus.SUBMITTED].includes(data.rfqStatus)){
        result.list.negotiation.push(item);
        salesReportData[data.createdByUserId].negotiation += Number(subtotal);
        salesReportData[data.createdByUserId].total += Number(subtotal);
      }else if([RfqStatus.COMPLETED].includes(data.rfqStatus)){
        result.list.won.push(item);
        salesReportData[data.createdByUserId].won += Number(subtotal);
        salesReportData[data.createdByUserId].total += Number(subtotal);
      }else if([RfqStatus.REJECTED,RfqStatus.CANCELLED].includes(data.rfqStatus)){
        result.list.loss.push(item);
      }
    }

    const allUserReport = {
      revenueTarget:0,
      totalProgress:0,
      proposition:0,
      negotiation:0,
      won:0,
    }

    for (const key in getAllSales){
      const item = getAllSales[key];
      getAllSales[key].revenueTarget = Number(getAllSales[key].revenueTarget);
      getAllSales[key].totalProgress = Number(getAllSales[key].totalProgress);
      getAllSales[key].totalProgressPercentage = '0.00%';
      getAllSales[key].proposition = '0.00%';
      getAllSales[key].negotiation = '0.00%';
      getAllSales[key].won = '0.00%';

      if(salesReportData[item.userId]){
        getAllSales[key].totalProgress = salesReportData[item.userId].total;
        getAllSales[key].totalProgressPercentage = (getAllSales[key].revenueTarget ? (Number(salesReportData[item.userId].total)/Number(getAllSales[key].revenueTarget)*100).toFixed(2) : '0') + '%';

        getAllSales[key].proposition = (getAllSales[key].revenueTarget ? (Number(salesReportData[item.userId].proposition)/Number(getAllSales[key].revenueTarget)*100).toFixed(2) : '0') + '%';
        getAllSales[key].negotiation = (getAllSales[key].revenueTarget ? (Number(salesReportData[item.userId].negotiation)/Number(getAllSales[key].revenueTarget)*100).toFixed(2) : '0') + '%';
        getAllSales[key].won = (getAllSales[key].revenueTarget ? (Number(salesReportData[item.userId].won)/Number(getAllSales[key].revenueTarget)*100).toFixed(2) : '0') + '%';

        allUserReport.totalProgress += Number(getAllSales[key].totalProgress);
        allUserReport.revenueTarget += Number(getAllSales[key].revenueTarget);
        allUserReport.proposition += Number(salesReportData[item.userId].proposition);
        allUserReport.negotiation += Number(salesReportData[item.userId].negotiation);
        allUserReport.won += Number(salesReportData[item.userId].won);

      }
    }

    result.salesList[0] = {
      userId:0,
      fullName: 'All User',
      revenueTarget: allUserReport.revenueTarget,
      totalProgress: allUserReport.totalProgress,
      totalProgressPercentage: (allUserReport.revenueTarget ? (Number(allUserReport.totalProgress)/Number(allUserReport.revenueTarget)*100).toFixed(2) : '0') + '%',
      proposition: (allUserReport.revenueTarget ? (Number(allUserReport.proposition)/Number(allUserReport.revenueTarget)*100).toFixed(2) : '0') + '%',
      negotiation: (allUserReport.revenueTarget ? (Number(allUserReport.negotiation)/Number(allUserReport.revenueTarget)*100).toFixed(2) : '0') + '%',
      won: (allUserReport.revenueTarget ? (Number(allUserReport.won)/Number(allUserReport.revenueTarget)*100).toFixed(2) : '0') + '%',
    }

    result.salesList = result.salesList.concat(getAllSales);

    return result;
  }


}
