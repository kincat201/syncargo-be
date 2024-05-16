import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, Repository } from 'typeorm';
import * as zip from 'adm-zip';
import { format } from 'date-fns';

import { Quotation } from 'src/entities/quotation.entity';
import { BidPrice } from 'src/entities/bid-price.entity';
import { ShipmentSelllingPrice } from 'src/entities/shipment-selling-price.entity';
import { Shipment } from 'src/entities/shipment.entity';
import { QuotationExtendLog } from 'src/entities/quotation-extend-log.entity';

import {
  ConsigneeLabelDetails,
  ExtendStatus,
  Features,
  InvoiceStatus,
  NotificationActionStatus,
  NotificationType,
  OtifStatus,
  QuotationFileSource,
  RfqLabel,
  RfqStatus,
  ShipmentService,
  ShipmentStatus,
  ShipmentType,
  ShipmentVia,
  ShipperLabelDetails,
} from 'src/enums/enum';
import { Helper } from '../helpers/helper';

import { CreateQuotationDto } from './dtos/create-quotation.dto';
import { UpdateQuotationDto } from './dtos/update-quotation.dto';
import { SubmitDraftShipperConsigneeDto } from './dtos/submit-draft-shipper-consignee.dto ';
import { CurrentUserDto } from '../auth/dtos/current-user.dto';
import { ChatRoomTypes } from '../../enums/chat';

import { S3Service } from 'src/s3/s3.service';
import { MailService } from 'src/mail/mail.service';
import { OriginDestinationService } from '../origin-destination/origin-destination.service';
import { PdfService } from 'src/pdf/pdf.service';
import { ShipmentHistoryService } from '../shipment-history/shipment-history.service';
import { PortsService } from '../ports/ports.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CompaniesService } from '../companies/companies.service';

import { ChatRoom } from '../../entities/chat-room.entity';
import { ChatCustomer } from '../../entities/chat-customer.entity';
import { User } from '../../entities/user.entity';
import { Port } from 'src/entities/port.entity';
import { Company } from 'src/entities/company.entity';
import { Bid } from 'src/entities/bid.entity';
import { MultipleCompleteQuotationDto } from './dtos/multiple-complete-quotation.dto';
import { UsersService } from '../users/users.service';
import NotificationSchedulingService from '../notification-scheduling/notification-scheduling.service';
import { QuotationFilesService } from '../quotation-files/quotation-files.service';
import { RequestRemoveFileDto } from '../shipments/dtos/request-remove-file.dto';
import { RoleFF, ShipmentLabel } from '../../enums/enum';
import { ChatService } from '../chat/chat.service';
import { QuotationFile } from '../../entities/quotation-file.entity';
import { QuotationRevenueHistoryService } from '../quotation-revenue-history/quotation-revenue-history.service';
import { UpdateRevenueNoteQuotation } from './dtos/update-revenue-note-quotation.dto';

@Injectable()
export class QuotationsService {
  constructor(
    @InjectRepository(Quotation) private quotationRepo: Repository<Quotation>,
    @InjectRepository(BidPrice) private bidPriceRepo: Repository<BidPrice>,
    @InjectRepository(ShipmentSelllingPrice)
    private shipmentSellingPriceRepo: Repository<ShipmentSelllingPrice>,
    @InjectRepository(Shipment) private shipmentRepo: Repository<Shipment>,
    @InjectRepository(QuotationExtendLog)
    private quotationExtendLogRepo: Repository<QuotationExtendLog>,
    @InjectRepository(ChatRoom) private chatRoomRepo: Repository<ChatRoom>,
    @InjectRepository(ChatCustomer)
    private chatCustomerRepo: Repository<ChatCustomer>,
    @InjectRepository(Port) private portRepo: Repository<Port>,
    @InjectRepository(Bid) private bidRepo: Repository<Bid>,
    private originDestinationService: OriginDestinationService,
    private pdfService: PdfService,
    private mailService: MailService,
    private s3Service: S3Service,
    private helper: Helper,
    private connection: Connection,
    private shipmentHistoryService: ShipmentHistoryService,
    private portsService: PortsService,
    private notificationsService: NotificationsService,
    private companiesService: CompaniesService,
    private userService: UsersService,
    private notificationSchedulingService: NotificationSchedulingService,
    private quotationFileService: QuotationFilesService,
    private chatService: ChatService,
    private quotationRevenueHistoryService: QuotationRevenueHistoryService,
  ) {}

  // step 1
  async create(user: CurrentUserDto, body: CreateQuotationDto) {
    const { userId, companyId, companyName } = user;

    let companyTrial;

    if(user.isTrial){
      companyTrial = await this.companiesService.findById(user.companyId);
      if(!companyTrial || (companyTrial.trialLimit && companyTrial.trialLimit.addQuotation === 0)){
        throw new BadRequestException('You have reached the limit of creating quotation!');
      }
    }

    const clientId = `${companyId}`.padStart(4, '0');
    const currentDate = format(new Date(), 'yyyyMMdd');

    let rfqNumber = `RFQ/${clientId}/${currentDate}-`;

    const quotation = await this.quotationRepo
      .createQueryBuilder('q')
      .innerJoin('q.customer', 'c')
      .innerJoin('c.company', 'ff')
      .select(['q.id', 'q.rfqNumber'])
      .where(
        `
        (
          (ff.id = :companyId)
          OR (ff.id != :companyId AND q.createdByCompanyId = :companyId)
        )
        AND q.status = :status
        AND YEAR(q.createdAt) = YEAR(NOW())
      `,
      )
      .setParameters({ companyId, status: 1 })
      .orderBy('q.id', 'DESC')
      .getOne();

    if (quotation) {
      let nextNumber = +quotation.rfqNumber.split('-').pop() + 1;
      if (!nextNumber) nextNumber = 1;
      rfqNumber += `${nextNumber}`.padStart(8, '0');
    } else {
      rfqNumber += '00000001';
    }

    body.packingList = this.helper.mapPackingList(
      body.shipmentType,
      body.packingList,
    );

    const newQuotation = await this.quotationRepo.create({
      ...body,
      cityFrom: body.cityFrom ?? 'All Cities',
      cityTo: body.cityTo ?? 'All Cities',
      affiliation: user.affiliation,
      rfqNumber,
      createdByCompanyId: companyId,
      createdByUserId: userId,
      companyId: companyId,
    });

    let totalQty = 0;
    let estimatedTotalWeight = 0;
    let volumetric = 0;

    const denumerator =
      body.shipmentType === ShipmentType.AIRCOURIER ? 5000 : 6000;

    body.packingList.forEach((obj) => {
      const isContainer =
        body.shipmentType === ShipmentType.SEAFCL ||
        body.shipmentType === ShipmentType.SEABREAKBULK;
      const quantity = isContainer ? obj.qty : obj.packageQty;

      totalQty += quantity;
      estimatedTotalWeight += obj.weight * quantity;

      if (body.shipmentType !== ShipmentType.SEAFCL) {
        volumetric +=
          ((obj['length'] * obj.width * obj.height) / denumerator) * quantity;
      }
    });

    if (estimatedTotalWeight >= 2147483647) {
      // mysql int
      throw new BadRequestException('Maximal total weight is 2.147.483.647');
    }
    if (volumetric >= Number.MAX_SAFE_INTEGER) {
      // mysql biigint > js maxsafeinteger
      throw new BadRequestException(
        'Maximal volumetric is 9.007.199.254.740.991',
      );
    }

    Object.assign(newQuotation, {
      totalQty,
      estimatedTotalWeight,
      volumetric: Math.round(volumetric),
    });

    return await this.connection.transaction(async (entityManager) => {
      const portBody = [
        {
          countryCode: body.countryFromCode,
          portName: body.portOfLoading,
        },
        {
          countryCode: body.countryToCode,
          portName: body.portOfDischarge,
        },
      ];

      const ports: Port[] = [];

      for (const el of portBody) {
        if (!el.countryCode || !el.portName) {
          continue;
        }

        const portBody = {
          companyId: companyId,
          countryCode: el.countryCode,
          portType: body.shipmentVia,
          portName: el.portName,
        };

        const isPortExist = await this.portRepo.count(portBody);

        if (!isPortExist) {
          const port = await this.portsService.create(
            companyId,
            userId,
            portBody,
            true,
          );
          ports.push(port);
        }
      }

      if (ports.length) {
        await entityManager.save(ports);
      }

      if (user.customerModule)
        await this.createRoomChatQuotation(rfqNumber, body.customerId, {
          id: companyId,
          name: companyName,
          affiliation: newQuotation.affiliation,
        });

      if(user.isTrial && companyTrial){
        companyTrial.trialLimit.addQuotation--;
        await entityManager.save(companyTrial);
      }

      // set quotation revenue history
      this.quotationRevenueHistoryService.submit(newQuotation.rfqNumber, RfqStatus.DRAFT, user);

      return await entityManager.save(newQuotation);
    });
  }

  // also used as edit in manage shipment - see details - details
  async update(
    user: CurrentUserDto,
    rfqNumber: string,
    body: UpdateQuotationDto,
  ) {

    const { userId, companyId } = user;

    const quotation = await this.quotationRepo
      .createQueryBuilder('q')
      .leftJoin('q.quotationNleCompany', 'qnc')
      .innerJoin('q.customer', 'c')
      .where(`
        q.rfqNumber = :rfqNumber
        AND q.status = :status
        AND (
          (q.affiliation = :affiliation AND qnc.companyId = :companyId AND qnc.status = :status)
          OR (q.affiliation != :affiliation AND ${ !user.isTrial ? `(c.companyId = :companyId OR c.affiliation = :affiliation)` : `(c.companyId = :companyId OR q.createdByCompanyId = :companyId OR q.affiliation = :dummyAffiliation)`})
        )
      `,
      )
      .setParameters({
        rfqNumber,
        companyId,
        status: 1,
        affiliation: 'NLE',
      })
      .getOne();

    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    // during process by related customer
    if (
      quotation.rfqStatus === RfqStatus.DRAFT &&
      !quotation.createdByCompanyId
    ) {
      throw new BadRequestException(
        'Not allow to edit draft quotation that still in process in customer',
      );
    }

    const consigneeChanges = [];
    const shipperChanges = [];

    if (quotation.rfqStatus === RfqStatus.COMPLETED) {
      const obj = { ...body };
      const differentChanges = this.helper.compareDifferentValue(
        quotation,
        obj,
        ['packingList'],
      );

      for (const item of differentChanges) {
        if (ConsigneeLabelDetails[item]) {
          consigneeChanges.push(
            ConsigneeLabelDetails[item] + ' has been updated',
          );
        }
        if (ShipperLabelDetails[item]) {
          shipperChanges.push(ShipperLabelDetails[item] + ' has been updated');
        }
      }
    }

    Object.assign(quotation, { updatedByUserId: userId });

    if (body.shipmentService) {
      const updateShipment = await this.shipmentRepo
        .createQueryBuilder()
        .where('rfqNumber = :rfqNumber', { rfqNumber })
        .update({ shipmentService: body.shipmentService })
        .execute();
    }

    if (!body.packingList) {
      delete body.packingList;
      Object.assign(quotation, body);
    } else if (body.packingList.length) {
      body.packingList = this.helper.mapPackingList(
        body.shipmentType,
        body.packingList,
      );
      let totalQty = 0;
      let estimatedTotalWeight = 0;
      let volumetric = 0;

      const denumerator =
        body.shipmentType === ShipmentType.AIRCOURIER ? 5000 : 6000;

      body.packingList.forEach((obj) => {
        const isContainer =
          body.shipmentType === ShipmentType.SEAFCL ||
          body.shipmentType === ShipmentType.SEABREAKBULK;
        const quantity = isContainer ? obj.qty : obj.packageQty;

        totalQty += quantity;
        estimatedTotalWeight += obj.weight * quantity;

        if (body.shipmentType !== ShipmentType.SEAFCL) {
          volumetric +=
            ((obj['length'] * obj.width * obj.height) / denumerator) * quantity;
        }
      });

      if (estimatedTotalWeight >= 2147483647) {
        // mysql int
        throw new BadRequestException('Maximal total weight is 2.147.483.647');
      }
      if (volumetric >= Number.MAX_SAFE_INTEGER) {
        // mysql biigint > js maxsafeinteger
        throw new BadRequestException(
          'Maximal volumetric is 9.007.199.254.740.991',
        );
      }

      body.cityFrom = body.cityFrom ? body.cityFrom : 'All Cities';
      body.cityTo = body.cityTo ? body.cityTo : 'All Cities';

      Object.assign(quotation, body, {
        totalQty,
        estimatedTotalWeight,
        volumetric: Math.round(volumetric),
      });
    }

    if (consigneeChanges.length > 0) {
      this.shipmentHistoryService.submit(userId, rfqNumber, {
        description: 'Consignee Details has been updated : ',
        details: JSON.stringify(consigneeChanges),
      });
    }
    if (shipperChanges.length > 0) {
      this.shipmentHistoryService.submit(userId, rfqNumber, {
        description: 'Shipper Information has been updated : ',
        details: JSON.stringify(shipperChanges),
      });
    }

    return await this.connection.transaction(async (entityManager) => {
      const portBody = [
        {
          countryCode: body.countryFromCode,
          portName: body.portOfLoading,
        },
        {
          countryCode: body.countryToCode,
          portName: body.portOfDischarge,
        },
      ];

      const ports: Port[] = [];

      for (const el of portBody) {
        if (!el.countryCode || !el.portName) {
          continue;
        }

        const portBody = {
          companyId: companyId,
          countryCode: el.countryCode,
          portType: body.shipmentVia,
          portName: el.portName,
        };

        const isPortExist = await this.portRepo.count(portBody);

        if (!isPortExist) {
          const port = await this.portsService.create(
            companyId,
            userId,
            portBody,
            true,
          );
          ports.push(port);
        }
      }

      if (ports.length) {
        await entityManager.save(ports);
      }

      return await entityManager.save(quotation);
    });
  }

  // data also used for preview (in FE)
  async getDetail(user: CurrentUserDto, rfqNumber: string) {
    const data = await this.quotationRepo
      .createQueryBuilder('q')
      .leftJoin('q.quotationNleCompany', 'qnc')
      .leftJoin('q.quotationFiles', 'qf','(qf.companyId = :companyId OR qf.companyId = 0 OR qf.companyId IS NULL) AND qf.status = :status')
      .leftJoin('q.bids', 'b', !user.isTrial? `b.companyId = :companyId OR b.companyId IS NULL`: ``)
      .leftJoin('b.bidprices', 'bp')
      .innerJoin('q.customer', 'c')
      .innerJoin('c.user', 'uc')
      .leftJoin('q.shipment', 's')
      .leftJoin('q.extendLogs', 'ql', 'ql.bidId = b.id OR ql.bidId IS NULL')
      .leftJoin('q.user', 'u')
      .leftJoinAndSelect('q.chatRoom', 'chat')
      .where(
        `
        q.rfqNumber = :rfqNumber
        AND q.status = :status
        AND (
          (q.affiliation = :affiliation AND qnc.companyId = :companyId AND qnc.status = :status)
          OR (q.affiliation != :affiliation AND ${ !user.isTrial ? `(c.companyId = :companyId OR c.affiliation = :affiliation)` : `(c.companyId = :companyId OR q.createdByCompanyId = :companyId OR q.affiliation = :dummyAffiliation)`})
        )
        ${
          !['admin', 'manager'].includes(user.role)
            ? 'AND (q.createdByUserId = :userId OR q.updatedByUserId = :userId OR q.rfqStatus = "WAITING_FOR_QUOTATION")'
            : ''
        }
      `,
      )
      .select([
        'q',
        'qf.id',
        'qf.originalName',
        'qf.url',
        'qf.source',
        'qf.platform',
        'qf.createdAt',
        'b.rfqStatus',
        'b.validUntil',
        'b.companyId',
        'b.vendorName',
        'b.shippingLine',
        'b.minDelivery',
        'b.maxDelivery',
        'b.note',
        'b.currency',
        'b.failedByCompanyId',
        'bp.priceCompName',
        'bp.uom',
        'bp.price',
        'bp.profit',
        'bp.total',
        'bp.note',
        'c.customerId',
        'c.companyName',
        'c.fullName',
        'uc.photo',
        'uc.customerLogin',
        's.otifStatus',
        'ql.date',
        'ql.extendStatus',
        'chat',
        'u.fullName',
      ])
      .setParameters({
        affiliation: 'NLE',
        dummyAffiliation: 'DUMMY',
        rfqNumber,
        companyId: user.companyId,
        status: 1,
        userId: user.userId,
      })
      .orderBy('ql.id', 'DESC')
      .addOrderBy('bp.id', 'ASC')
      .getOne();
    if (!data) {
      throw new NotFoundException('Quotation not found');
    }

    if (
      !data ||
      (data.rfqStatus === RfqStatus.DRAFT && !data.createdByCompanyId)
    ) {
      throw new NotFoundException('Quotation not found');
    }

    const isNle = data.affiliation === 'NLE';

    if (isNle) {
      data.rfqStatus = data.bids?.[0]?.rfqStatus ?? RfqStatus.WAITING;
      data.validUntil = data.bids?.[0]?.validUntil ?? null;
    }

    let isQuotationNull = true;
    const keys = [
      'shippingLine',
      'vendorName',
      'minDelivery',
      'maxDelivery',
      'currency',
      'bidprices',
    ];

    for (let i = 0; i < keys.length; i++) {
      const el = data.bids?.[0]?.[keys[i]];

      if (
        (typeof el === 'string' && el.length) ||
        (typeof el === 'number' && el) ||
        (Array.isArray(el) && el.length)
      ) {
        isQuotationNull = false;
        break;
      }
    }

    if (isQuotationNull) {
      isQuotationNull = data.validUntil?.length ? false : true;
    }

    const details = {
      extend: data.extendLogs?.[0] ?? null,
      expiredAt:
        data.validUntil < data.rfqExpired
          ? data.validUntil
          : !data.rfqExpired
          ? data.validUntil
          : data.rfqExpired,
      validUntil: data.validUntil,
      rfqExpired: data.rfqExpired,
      failedBy: null,
      otifStatus: data.shipment?.otifStatus,
      subtotal:
        data.bids?.[0]?.bidprices?.reduce(
          (acc, el) => acc + Number(el.total),
          0,
        ) ?? 0,
      // shipping
      customer: {
        customerId: data.customerId,
        companyName: data.customer.companyName,
        fullName:
          data.affiliation == 'NLE' ? 'NLE Customer' : data.customer.fullName,
        photo: data.customer.user?.photo ?? null,
        customerLogin: data.customer.user.customerLogin,
      },
      id: data.id,
      rfqNumber: data.rfqNumber,
      rfqStatus: data.rfqStatus,
      limitWaFF: data.limitWaFF,
      limitWaCustomer: data.limitWaCustomer,
      shipmentVia: data.shipmentVia,
      shipmentService: data.shipmentService,
      countryFrom: data.countryFrom,
      cityFrom: data.cityFrom,
      portOfLoading: data.portOfLoading,
      addressFrom: data.addressFrom,
      zipcodeFrom: data.zipcodeFrom,
      countryTo: data.countryTo,
      cityTo: data.cityTo,
      portOfDischarge: data.portOfDischarge,
      addressTo: data.addressTo,
      zipcodeTo: data.zipcodeTo,
      customerPosition: data.customerPosition,
      routeType: data.routeType,
      shipmentDate: data.shipmentDate,
      affiliation: data.affiliation,
      createdBy: data.user.fullName,
      // shipment type
      shipmentType: data.shipmentType,
      totalQty: data.totalQty,
      estimatedTotalWeight: data.estimatedTotalWeight,
      volumetric: data.volumetric,
      packingList: data.packingList,
      // product type
      productType: data.productType,
      kindOfGoods: data.kindOfGoods,
      valueOfGoods: data.valueOfGoods,
      currency: data.currency,
      hsCode: data.hsCode,
      poNumber: data.poNumber,
      unNumber: data.unNumber,
      description: data.description,
      quotationFiles: data.quotationFiles.map((el) => {
        return { id: el.id, originalName: el.originalName };
      }),
      // additional
      remark: data.remark,
      originCustomsClearance: data.originCustomsClearance,
      destinationCustomsClearance: data.destinationCustomsClearance,
      warehouseStorage: data.warehouseStorage,
      // shipper details
      shipperName: data.shipperName,
      shipperCompany: data.shipperCompany,
      shipperPhoneCode: data.shipperPhoneCode,
      shipperPhone: data.shipperPhone,
      shipperTaxId: data.shipperTaxId,
      shipperEmail: data.shipperEmail,
      shipperZipCode: data.shipperZipCode,
      shipperAddress: data.shipperAddress,
      //consignee details
      consigneeName: data.consigneeName,
      consigneeCompany: data.consigneeCompany,
      consigneePhoneCode: data.consigneePhoneCode,
      consigneePhone: data.consigneePhone,
      consigneeTaxId: data.consigneeTaxId,
      consigneeEmail: data.consigneeEmail,
      consigneeZipCode: data.consigneeZipCode,
      consigneeAddress: data.consigneeAddress,
    };

    if (
      data.rfqStatus === RfqStatus.CANCELLED ||
      data.rfqStatus === RfqStatus.REJECTED
    ) {
      details.failedBy = data.failedByCompanyId ? 'FF' : 'CUST';
      if (isNle) {
        details.failedBy = data.bids?.[0]?.failedByCompanyId ? 'FF' : 'CUST';
      }
    }

    const document = [];
    const documentChat = [];

    data.quotationFiles.forEach((item) => {
      if (item.source === QuotationFileSource.CHAT || item.platform === 'CUSTOMER') {
        documentChat.push(item);
      } else {
        document.push(item);
      }
    });

    return {
      details,
      quotation: isQuotationNull
        ? null
        : { validUntil: data.validUntil, ...data.bids?.[0] },
      document,
      documentChat,
      chatExist: data.chatRoom ? true : false,
      showSubtotal: data.showSubtotal,
    };
  }

  async getPaged(
    page: number,
    perpage: number,
    section: string,
    rfqStatus: RfqStatus,
    label: RfqLabel,
    shipmentVia: ShipmentVia,
    shipmentType: ShipmentType,
    createdAt: string,
    search: string,
    currentUser: CurrentUserDto,
  ) {
    const limit = perpage;
    const offset = perpage * (page - 1);

    const rfqStatusArr = [];
    if (section.toUpperCase() === 'ONGOING') {
      if (rfqStatus) {
        rfqStatusArr.push(rfqStatus);
      } else {
        rfqStatusArr.push(
          RfqStatus.DRAFT,
          RfqStatus.WAITING,
          RfqStatus.SUBMITTED,
        );
      }
    } else if (section.toUpperCase() === 'COMPLETED') {
      rfqStatusArr.push(RfqStatus.COMPLETED);
    } else if (section.toUpperCase() === 'FAILED') {
      if (rfqStatus) {
        rfqStatusArr.push(rfqStatus);
      } else {
        rfqStatusArr.push(RfqStatus.CANCELLED, RfqStatus.REJECTED);
      }
    }

    const query = this.quotationRepo
      .createQueryBuilder('q')
      .innerJoin('q.customer', 'c')
      .leftJoin('q.extendLogs', 'ql')
      .leftJoin('q.user', 'u')
      .where(
        `
        q.status = :status
        AND IF (
          q.rfqStatus = 'DRAFT',
          q.createdByCompanyId IS NOT NULL,
          q.createdByCompanyId IS NOT NULL OR q.createdByCompanyId IS NULL
        )
        AND q.affiliation != :affiliation
        AND ${!currentUser.isTrial ? `(c.companyId = :companyId)` : `(c.companyId = :companyId OR q.createdByCompanyId = :companyId OR q.affiliation = :dummyAffiliation)`}
        ${
          !['admin', 'manager'].includes(currentUser.role)
            ? 'AND (q.createdByUserId = :userId OR q.updatedByUserId = :userId OR q.rfqStatus = "WAITING_FOR_QUOTATION")'
            : ''
        }
      `,
      )
      .groupBy('q.rfqNumber')
      .select([
        'q.rfqStatus AS rfqStatus',
        'q.rfqNumber AS rfqNumber',
        'q.createdAt AS createdAt',
        'q.shipmentVia AS shipmentVia',
        'q.shipmentType AS shipmentType',
        'q.shipmentService AS shipmentService',
        'q.countryFrom AS countryFrom',
        'q.cityFrom AS cityFrom',
        'q.countryTo AS countryTo',
        'q.cityTo AS cityTo',
        `IF (
          DATE(q.validUntil) < DATE(q.rfqExpired),
          q.validUntil,
          COALESCE(q.rfqExpired, q.validUntil)
        ) AS expiredAt`,
        'q.validUntil AS validUntil',
        'q.rfqExpired AS rfqExpired',
        'c.companyName AS companyName',
        'ql.date AS requestExtendDate',
        'ql.extendStatus AS extendStatus',
        'u.fullName as createdBy'
      ])
      .setParameters({
        affiliation: 'NLE',
        dummyAffiliation: 'DUMMY',
        rfqStatus: rfqStatusArr,
        companyId: currentUser.companyId,
        status: 1,
        userId: currentUser.userId,
      })
      .having(`q.rfqStatus IN (:...rfqStatus)`)
      .orderBy('q.updatedAt', 'DESC');

    if (section.toUpperCase() === 'ONGOING') {
      if (label === RfqLabel.REQUESTED || label === RfqLabel.REJECTED) {
        query.andHaving(`ql.extendStatus = :label`, { label });
      } else if (label === RfqLabel.EXPIRED) {
        query.andHaving(`(DATE(expiredAt) <= CURDATE())`);
      }
    } else if (section.toUpperCase() === 'FAILED') {
      if (label === RfqLabel.EXPIRED) {
        query.andHaving(`(DATE(expiredAt) <= CURDATE())`);
      }
    }
    if (shipmentVia) {
      query.andWhere('(q.shipmentVia = :shipmentVia)', { shipmentVia });
    }
    if (shipmentType) {
      if (shipmentType.includes('SEAFCL')) {
        query.andWhere(
          `(q.shipmentType = :shipmentType OR q.packingList like :shipmentType)`,
          { shipmentType: `%${shipmentType}%` },
        );
      } else {
        query.andWhere('q.shipmentType = :shipmentType', { shipmentType });
      }
    }
    if (createdAt) {
      const from = createdAt.split('to')[0];
      const until = createdAt.split('to')[1];
      query.andWhere(
        `(DATE(q.createdAt) >= :from AND DATE(q.createdAt) <= :until)`,
        { from, until },
      );
    }
    if (search) {
      query.andWhere(
        `(
          q.rfqNumber like :search
          OR c.companyName like :search
          OR q.countryFrom like :search
          OR q.countryTo like :search
          OR q.cityFrom like :search
          OR q.cityTo like :search
          OR q.shipmentType like :search
          OR q.packingList like :search
        )`,
        { search: `%${search}%` },
      );
    }
    const allData = await query.getRawMany();
    const totalRecord = allData.length;

    const data = await query.limit(limit).offset(offset).getRawMany();
    const totalShowed = data.length;

    return {
      page,
      totalRecord,
      totalShowed,
      totalPage: Math.ceil(totalRecord / limit),
      showing: `${totalRecord === 0 ? 0 : offset + 1} - ${offset + totalShowed
        } of ${totalRecord}`,
      next: offset + totalShowed !== totalRecord,
      data,
    };
  }

  async getPagedNle(
    page: number,
    perpage: number,
    section: string,
    rfqStatus: RfqStatus,
    label: RfqLabel,
    shipmentVia: ShipmentVia,
    shipmentType: ShipmentType,
    createdAt: string,
    search: string,
    currentUser: CurrentUserDto,
  ) {
    const limit = perpage;
    const offset = perpage * (page - 1);

    const rfqStatusArr = [];
    if (section.toUpperCase() === 'ONGOING') {
      if (rfqStatus) {
        rfqStatusArr.push(rfqStatus);
      } else {
        rfqStatusArr.push(RfqStatus.WAITING, RfqStatus.SUBMITTED);
      }
    } else if (section.toUpperCase() === 'COMPLETED') {
      rfqStatusArr.push(RfqStatus.COMPLETED);
    } else if (section.toUpperCase() === 'FAILED') {
      if (rfqStatus) {
        rfqStatusArr.push(rfqStatus);
      } else {
        rfqStatusArr.push(RfqStatus.CANCELLED, RfqStatus.REJECTED);
      }
    }

    const query = this.quotationRepo
      .createQueryBuilder('q')
      .innerJoin('q.customer', 'c')
      .innerJoin('q.quotationNleCompany', 'qnc')
      .leftJoin('q.bids', 'b', 'b.companyId = :companyId')
      .leftJoin('q.extendLogs', 'ql', 'ql.bidId = b.id')
      .leftJoin('q.user', 'u')
      .where(
        `
        q.status = :status
        AND q.affiliation = :affiliation
        AND qnc.companyId = :companyId
        AND qnc.status = :status
        AND IF (
          b.rfqStatus IS NULL  AND q.rfqStatus NOT IN ("${RfqStatus.CANCELLED}", "${RfqStatus.REJECTED}"),
          "${RfqStatus.WAITING}",
          IF(b.rfqStatus IS NULL, q.rfqStatus, b.rfqStatus)
        ) IN (:...rfqStatus)
      `,
      )
      .groupBy('q.rfqNumber')
      .select([
        `IF(b.rfqStatus IS NULL AND q.rfqStatus NOT IN ("${RfqStatus.CANCELLED}", "${RfqStatus.REJECTED}"), "${RfqStatus.WAITING}", IF(b.rfqStatus IS NULL, q.rfqStatus, b.rfqStatus)) AS rfqStatus`,
        'q.rfqNumber AS rfqNumber',
        'q.createdAt AS createdAt',
        'q.shipmentVia AS shipmentVia',
        'q.shipmentType AS shipmentType',
        'q.shipmentService AS shipmentService',
        'q.countryFrom AS countryFrom',
        'q.cityFrom AS cityFrom',
        'q.countryTo AS countryTo',
        'q.cityTo AS cityTo',
        `IF (
          DATE(b.validUntil) < DATE(q.rfqExpired),
          b.validUntil,
          COALESCE(q.rfqExpired, b.validUntil)
        ) AS expiredAt`,
        'b.validUntil AS validUntil',
        'q.rfqExpired AS rfqExpired',
        'c.companyName AS companyName',
        'ql.date AS requestExtendDate',
        'ql.extendStatus AS extendStatus',
        'u.fullName AS createdBy',
      ])
      .setParameters({
        rfqStatus: rfqStatusArr,
        affiliation: 'NLE',
        companyId: currentUser.companyId,
        status: 1,
      })
      .orderBy('q.updatedAt', 'DESC');

    if (section.toUpperCase() === 'ONGOING') {
      if (label === RfqLabel.REQUESTED || label === RfqLabel.REJECTED) {
        query.andHaving(`ql.extendStatus = :label`, { label });
      } else if (label === RfqLabel.EXPIRED) {
        query.andHaving(`(DATE(expiredAt) <= CURDATE())`);
      }
    } else if (section.toUpperCase() === 'FAILED') {
      if (label === RfqLabel.EXPIRED) {
        query.andHaving(`(DATE(expiredAt) <= CURDATE())`);
      }
    }
    if (shipmentVia) {
      query.andWhere('(q.shipmentVia = :shipmentVia)', { shipmentVia });
    }
    if (shipmentType) {
      if (shipmentType.includes('SEAFCL')) {
        query.andWhere(
          `(q.shipmentType like :shipmentType OR q.packingList like :shipmentType)`,
          { shipmentType: `%${shipmentType}%` },
        );
      } else {
        query.andWhere('q.shipmentType = :shipmentType', { shipmentType });
      }
    }
    if (createdAt) {
      const from = createdAt.split('to')[0];
      const until = createdAt.split('to')[1];
      query.andWhere(
        `(DATE(q.createdAt) >= :from AND DATE(q.createdAt) <= :until)`,
        { from, until },
      );
    }
    if (search) {
      query.andWhere(
        `(
          q.rfqNumber like :search
          OR c.companyName like :search
          OR q.countryFrom like :search
          OR q.countryTo like :search
          OR q.cityFrom like :search
          OR q.cityTo like :search
          OR q.shipmentType like :search
          OR q.packingList like :search
        )`,
        { search: `%${search}%` },
      );
    }
    const allData = await query.getRawMany();
    const totalRecord = allData.length;

    const data = await query.limit(limit).offset(offset).getRawMany();
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

  async getOne(payload: object, select?) {
    return await this.quotationRepo.findOne(
      { ...payload },
      { select: select ?? ['id'] },
    );
  }

  // step 3 and override (quotation submitted)
  async submitShipperConsignee(
    user: CurrentUserDto,
    rfqNumber: string,
    body: SubmitDraftShipperConsigneeDto,
  ) {
    const quotation = await this.quotationRepo
      .createQueryBuilder('q')
      .innerJoin(
        'q.customer',
        'c',
        'c.companyId = :companyId OR c.affiliation = :affiliation',
      )
      .leftJoin('c.user', 'u', 'u.userStatus = :userStatus', {
        userStatus: 'USERVERIFICATION',
      })
      .innerJoin('c.company', 'ff')
      .innerJoin('q.bids', 'b')
      .innerJoin('b.bidprices', 'bp')
      .leftJoin('q.quotationNleCompany', 'qnc')
      .select([
        'q',
        'b.vendorName',
        'b.shippingLine',
        'b.currency',
        'bp',
        'c.companyName',
        'c.fullName',
        'c.email',
        'u.customerLogin',
        'ff.name',
      ])
      .where(`
        q.rfqNumber = :rfqNumber
        AND q.rfqStatus IN (:...rfqStatus)
        AND q.status = :status
        AND (
          (q.affiliation = :affiliation AND qnc.companyId = :companyId AND qnc.status = :status)
          OR (q.affiliation != :affiliation AND ${ !user.isTrial ? `(c.companyId = :companyId OR c.affiliation = :affiliation)` : `(c.companyId = :companyId OR q.createdByCompanyId = :companyId OR q.affiliation = :dummyAffiliation)`})
        )
      `,
      )
      .setParameters({
        rfqNumber,
        affiliation: 'NLE',
        dummyAffiliation: 'DUMMY',
        rfqStatus: [RfqStatus.DRAFT, RfqStatus.SUBMITTED],
        companyId: user.companyId,
        status: 1,
      })
      .getOne();

    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    Object.assign(quotation, { ...body, updatedByUserId: user.userId });

    // step 3
    if (quotation.rfqStatus === RfqStatus.DRAFT) {
      delete quotation.customer;
      delete quotation.bids;
      return await this.quotationRepo.save(quotation);
    }

    // override

    if (quotation.affiliation === 'NLE') {
      throw new NotFoundException('Quotation not found');
    }

    const expiredAt =
      quotation.validUntil < quotation.rfqExpired
        ? quotation.validUntil
        : !quotation.rfqExpired
        ? quotation.validUntil
        : quotation.rfqExpired;

    if (new Date() > new Date(expiredAt)) {
      throw new BadRequestException('RFQ is expired');
    }

    quotation.rfqStatus = RfqStatus.COMPLETED;
    quotation.companyId = user.companyId;

    const company = await this.companiesService.getOne({ id: user.companyId }, [
      'id',
      'name',
      'logo',
      'phoneCode',
      'phoneNumber',
      'address',
      'email',
      'blTerms',
    ]);

    const shipment = this.shipmentRepo.create({
      vendor: quotation.bids[0].vendorName,
      shippingLine: quotation.bids[0].shippingLine,
      customerId: quotation.customerId,
      shipmentService: quotation.shipmentService,
      rfqNumber,
      currency: quotation.bids[0].currency,
      createdByUserId: user.userId,
      createdByCompanyId: user.companyId,
      //blTerms: company.blTerms,
    });

    const bidPrices = await this.bidPriceRepo
      .createQueryBuilder('bp')
      .select(['bp.priceCompName', 'bp.uom', 'bp.price', 'bp.total'])
      .innerJoin('bp.bid', 'b')
      .where('b.rfqId = :rfqId AND b.status = :status AND bp.status = :status')
      .setParameters({ rfqId: quotation.id, status: 1 })
      .getMany();

    const sellingPricesValue = [];
    bidPrices.forEach((el) => {
      sellingPricesValue.push({
        rfqNumber: rfqNumber,
        priceComponent: el.priceCompName,
        uom: el.uom,
        price: el.total,
        createdByUserId: user.userId,
      });
    });
    const sellingPrices =
      this.shipmentSellingPriceRepo.create(sellingPricesValue);

    // sending email
    const origin = await this.originDestinationService.getCityCode(
      user.companyId,
      quotation.cityFrom,
      user.isTrial
    );
    const destination = await this.originDestinationService.getCityCode(
      user.companyId,
      quotation.cityTo,
      user.isTrial
    );

    const mailBody = {
      ff: company,
      companyName: quotation.customer.companyName,
      customerName: quotation.customer.fullName,
      email: quotation.customer.email,
      origin: quotation.cityFrom,
      destination: quotation.cityTo,
      shipmentService: quotation.shipmentService,
      isFromDoor:
        quotation.shipmentService === ShipmentService.DTD ||
        quotation.shipmentService === ShipmentService.DTP,
      isToDoor:
        quotation.shipmentService === ShipmentService.DTD ||
        quotation.shipmentService === ShipmentService.PTD,
      otifStatus: 'Booked',
      icons: this.helper.mapOtifIcons(
        quotation.shipmentVia,
        quotation.shipmentService,
        OtifStatus.BOOKED,
      ),
      details: {
        rfqNumber: quotation.rfqNumber,
      },
      ffName: company.name,
      ffLogo: company.logo,
      ffEmail: company.email,
      ffAddress: company.address,
      ffPhoneCode: company.phoneCode,
      ffPhoneNumber: company.phoneNumber,
    };

    mailBody[quotation.shipmentVia] = true;

    const notificationBody = {
      ffName: quotation.customer.company.name,
      customerId: quotation.customerId,
      type: NotificationType.SHIPMENT,
      shipmentVia: quotation.shipmentVia,
      rfqNumber,
      countryFrom: quotation.countryFrom,
      countryTo: quotation.countryTo,
      actionStatus: NotificationActionStatus[`OTIF_${OtifStatus.BOOKED}`],
      isRead: false,
      createdAt: new Date(),
      createdBy: user.userId,
    };

    const users = await this.userService.getCompanyUsers(user.companyId, [
      'userId',
    ]);

    const receipient = {
      platform: 'FF',
      companyId: user.companyId,
      users: users.map((obj) => ({
        ...obj,
        isRead: false,
      })),
    };

    const blNotificationBody = {
      ...notificationBody,
      type: NotificationType.BL,
      actionStatus: NotificationActionStatus.BL_TEMPLATE_REMINDER,
      receipient,
      countryToCode: quotation.countryToCode,
      countryFromCode: quotation.countryFromCode,
    };

    return await this.connection.transaction(async (entityManager) => {
      const isCustomerLoginable = quotation.customer.user?.customerLogin;
      delete quotation.customer;
      await entityManager.update(Company, company.id, company);
      delete quotation.bids;

      await entityManager.save(quotation);
      await entityManager.save(sellingPrices);

      const result = await entityManager.save(shipment);

      this.mailService.submitOtif(mailBody);

      if (user.customerModule && isCustomerLoginable) {
        this.notificationsService.create(notificationBody);

        if (quotation.shipmentVia === ShipmentVia.OCEAN) {
          this.notificationsService.create(blNotificationBody);
          // Schedule a Reminder if company has not create any BL
          const now = new Date();
          this.notificationSchedulingService.scheduleNotification(
            rfqNumber,
            new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toString(),
            blNotificationBody,
          );
        }
      }

      // set quotation revenue history
      this.quotationRevenueHistoryService.submit(quotation.rfqNumber, quotation.rfqStatus, user);

      return result;
    });
  }

  async cancelOrRejectQuotation(user: CurrentUserDto, rfqNumber: string) {
    const quotation = await this.quotationRepo
      .createQueryBuilder('q')
      .leftJoin('q.quotationNleCompany', 'qnc')
      .innerJoin('q.bids', 'b')
      .innerJoin('q.customer', 'c')
      .leftJoin('c.user', 'u', 'u.userStatus = :userStatus', {
        userStatus: 'USERVERIFICATION',
      })
      .leftJoinAndSelect('q.shipment', 's')
      .select(['q', 'b', 'c.id', 'u.customerLogin'])
      .where(
        `
        q.rfqNumber = :rfqNumber
        AND q.rfqStatus NOT IN (:...rfqStatus)
        AND q.status = :status
        AND (
          (q.affiliation = :affiliation AND qnc.companyId = :companyId AND qnc.status = :status)
          OR (q.affiliation != :affiliation AND (c.companyId = :companyId OR c.affiliation = :affiliation))
        )
      `,
      )
      .setParameters({
        rfqNumber,
        rfqStatus: [RfqStatus.CANCELLED, RfqStatus.REJECTED],
        affiliation: 'NLE',
        companyId: user.companyId,
        status: 1,
      })
      .getOne();

    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    const isNle = quotation.affiliation === 'NLE';

    if (user.customerModule || (user.companyFeatureIds.includes(Features.CRM) && (quotation.rfqStatus === RfqStatus.SUBMITTED))) {
      // only able to reject as quotation submitted

      if (quotation.rfqStatus !== RfqStatus.SUBMITTED) {
          throw new NotFoundException('Quotation not found');
      }

      let bid = null;

      if (!isNle || quotation.companyId == user.companyId) {
        Object.assign(quotation, {
          rfqStatus: RfqStatus.REJECTED,
          failedByCompanyId: user.companyId,
          updatedByUserId: user.userId,
          companyId: user.companyId,
        });
      } else {
        quotation.bids.map((item) => {
          if (item.companyId == user.companyId) {
            if (item.rfqStatus != RfqStatus.SUBMITTED)
              throw new BadRequestException(
                'only able to reject as quotation submitted',
              );

            item.rfqStatus = RfqStatus.REJECTED;
            item.failedByCompanyId = user.companyId;
            item.updatedByUserId = user.userId;
            bid = item;
          }
        });
      }

      return await this.connection.transaction(async (entityManager) => {
        if (bid) {
          await entityManager.save(bid);
        } else {
          await entityManager.save(quotation);
          const quotationData = await this.getDownloadData(
            quotation.rfqNumber,
            user
          );

          if (
            !quotationData.customer.notificationSettingDisabled.find(
              (item) => item.name == 'QUOTATION_REJECT',
            )
          ) {
            const data = {
              customerName: quotationData.customer.fullName,
              customerEmail: quotationData.customer.email,
              rfqNumber,
              ffName: quotationData.company.name,
              ffLogo: quotationData.company.logo,
              ffEmail: quotationData.company.email,
              ffAddress: quotationData.company.address,
              ffPhoneCode: quotationData.company.phoneCode,
              ffPhoneNumber: quotationData.company.phoneNumber,
              createdDate: format(
                new Date(quotationData.createdAt),
                'd LLL yyyy',
              ),
              countryFrom: quotationData.countryFrom,
              cityFrom: quotationData.cityFrom,
              countryTo: quotationData.countryTo,
              cityTo: quotationData.cityTo,
              countryFromCode: quotationData.countryFromCode,
              countryToCode: quotationData.countryToCode,
              shipmentType: quotationData.shipmentVia,
              approvalTitle: 'Reject',
              approval: 'rejected',
            };
            // const origin = await this.originDestinationService.getCityCode(
            //   user.companyId,
            //   data.cityFrom,
            // );
            // const destination = await this.originDestinationService.getCityCode(
            //   user.companyId,
            //   data.cityTo,
            // );
            Object.assign(data, {
              origin: data.cityFrom,
              destination: data.cityTo,
            });

            this.mailService.approvalQuotation(data.customerEmail, null, data);
          }
        }

        if (user.customerModule && quotation.customer?.user?.customerLogin) {
          this.notificationsService.create({
            customerId: quotation.customerId,
            type: NotificationType.QUOTATION,
            rfqNumber: quotation.rfqNumber,
            countryFrom: quotation.countryFrom,
            countryTo: quotation.countryTo,
            actionStatus: NotificationActionStatus.QUOTATION_REJECTED,
            isRead: false,
            createdAt: new Date(),
            createdBy: user.userId,
          });
        }

        // set quotation revenue history
        this.quotationRevenueHistoryService.submit(quotation.rfqNumber, quotation.rfqStatus, user);

        return quotation;
      });
    }

    // only able to cancel as long as shipment booked
    if (
      quotation.shipment &&
      quotation.shipment.otifStatus !== OtifStatus.BOOKED
    ) {
      throw new BadRequestException(
        'Only allow cancel quotation if shipment still in booked',
      );
    }

    let bid = {};
    let shipment = {};

    if (!isNle || quotation.companyId == user.companyId) {
      shipment = quotation.shipment;
      Object.assign(quotation, {
        rfqStatus: RfqStatus.CANCELLED,
        failedByCompanyId: user.companyId,
        updatedByUserId: user.userId,
        companyId: user.companyId,
      });
    } else {
      quotation.bids.map((item) => {
        if (item.companyId == user.companyId) {
          item.rfqStatus = RfqStatus.CANCELLED;
          item.failedByCompanyId = user.companyId;
          item.updatedByUserId = user.userId;
          bid = item;
        }
      });
    }

    return await this.connection.transaction(async (entityManager) => {
      if (shipment) {
        quotation.shipment.shipmentStatus = ShipmentStatus.FAILED;
        quotation.shipment.otifStatus = OtifStatus.CANCELLED;
        quotation.shipment.updatedByUserId = user.userId;
        await entityManager.save(quotation.shipment);
      }

      if (bid) {
        await entityManager.save(quotation.bids);
      } else {
        delete quotation.bids;
      }
      const result = await entityManager.save(quotation);

      if (user.customerModule && quotation.customer.user?.customerLogin) {
        this.notificationsService.create({
          customerId: quotation.customerId,
          type: NotificationType.QUOTATION,
          rfqNumber: quotation.rfqNumber,
          countryFrom: quotation.countryFrom,
          countryTo: quotation.countryTo,
          actionStatus: NotificationActionStatus.QUOTATION_CANCELLED,
          isRead: false,
          createdAt: new Date(),
          createdBy: user.userId,
        });
      }

      // set quotation revenue history
      this.quotationRevenueHistoryService.submit(quotation.rfqNumber, quotation.rfqStatus, user);

      return result;
    });
  }

  async getDownloadData(
    rfqNumber: string,
    user: CurrentUserDto,
  ) {

    const { affiliation, companyId } = user;

    const data = await this.quotationRepo
      .createQueryBuilder('q')
      .leftJoin('q.quotationNleCompany', 'qnc')
      .leftJoin('q.quotationFiles', 'qf')
      .leftJoin('q.bids', 'b')
      .leftJoin('b.bidprices', 'bp')
      .innerJoin('q.customer', 'c')
      .leftJoin('c.notificationSettingDisabled', 'nsd')
      .leftJoin('q.shipment', 's')
      .where(
        `
        q.rfqNumber = :rfqNumber
        AND q.status = :status
        AND (
          (q.affiliation = :affiliation AND qnc.companyId = :companyId AND qnc.status = :status)
          OR (q.affiliation != :affiliation AND (c.companyId = :companyId OR c.affiliation = :affiliation))
        )
      `,
      )
      .select([
        'q',
        'qf.originalName',
        'qf.url',
        'qf.createdAt',
        'b.companyId',
        'b.rfqStatus',
        'b.validUntil',
        'b.shippingLine',
        'b.minDelivery',
        'b.maxDelivery',
        'b.currency',
        'bp.priceCompName',
        'bp.uom',
        'bp.total',
        'bp.note',
        'c.companyName',
        'c.fullName',
        'c.email',
        's.otifStatus',
        'nsd',
      ])
      .setParameters({
        rfqNumber,
        companyId,
        status: 1,
        affiliation: 'NLE',
        dummyAffiliation: 'DUMMY',
      })
      .orderBy('bp.id', 'ASC')
      .getOne();

    if (!data) {
      throw new NotFoundException('Quotation not found');
    }

    const company = await this.companiesService.getOne(
      { id: companyId, status: 1 },
      [
        'logo',
        'name',
        'address',
        'email',
        'phoneCode',
        'phoneNumber',
        'npwp',
        'quotationNotes',
        'quotationRemark',
      ],
    );

    let subtotal = 0;
    let bid = {};

    if (data.affiliation != 'NLE') {
      subtotal =
        data.bids[0]?.bidprices?.reduce(
          (acc, el) => acc + Number(el.total),
          0,
        ) ?? 0;
      bid = { ...data.bids[0] };
    } else {
      data.rfqStatus = RfqStatus.WAITING;
      data.bids.map((item) => {
        if (item.companyId == companyId) {
          data.validUntil = item.validUntil;
          data.rfqStatus = item.rfqStatus;
          subtotal =
            item?.bidprices?.reduce((acc, el) => acc + Number(el.total), 0) ??
            0;
          bid = { ...item };
        }
      });
    }

    return {
      createdAt: data.createdAt,
      // header & footer
      company,
      customer: {
        companyName: data.customer.companyName,
        fullName:
          data.affiliation == 'NLE' ? 'NLE Customer' : data.customer.fullName,
        email: data.customer.email,
        notificationSettingDisabled: data.customer.notificationSettingDisabled,
      },
      // shipping
      rfqNumber: data.rfqNumber,
      shipmentVia: data.shipmentVia,
      shipmentService: data.shipmentService,
      countryFrom: data.countryFrom,
      cityFrom: data.cityFrom,
      portOfLoading: data.portOfLoading,
      addressFrom: data.addressFrom,
      zipcodeFrom: data.zipcodeFrom,
      countryTo: data.countryTo,
      cityTo: data.cityTo,
      countryFromCode: data.countryFromCode,
      countryToCode: data.countryToCode,
      portOfDischarge: data.portOfDischarge,
      addressTo: data.addressTo,
      zipcodeTo: data.zipcodeTo,
      shipmentDate: data.shipmentDate,
      // shipment data
      shipmentType: data.shipmentType,
      totalQty: data.totalQty,
      estimatedTotalWeight: data.estimatedTotalWeight,
      volumetric: data.volumetric,
      packingList: data.packingList,
      // bid & bidprices
      validUntil: data.validUntil,
      ...bid,
      subtotal,
      limitWaFF: data.limitWaFF,
      affiliation: data.affiliation,
      showSubtotal: data.showSubtotal,
    };
  }

  async downloadAttachment(
    companyId: number,
    rfqNumber: string,
    fileName: string,
  ) {
    return await this.quotationRepo
      .createQueryBuilder('q')
      .leftJoin('q.quotationNleCompany', 'qnc')
      .innerJoin('q.customer', 'c')
      .innerJoin('q.quotationFiles', 'qf')
      .where(
        `
        q.rfqNumber = :rfqNumber
        AND q.status = :status
        AND qf.fileName = :fileName
        AND (
          (q.affiliation = :affiliation AND qnc.companyId = :companyId AND qnc.status = :status)
          OR (q.affiliation != :affiliation AND (c.companyId = :companyId OR c.affiliation = :affiliation))
        )
      `,
      )
      .setParameters({
        rfqNumber,
        companyId,
        status: 1,
        fileName,
        affiliation: 'NLE',
      })
      .getCount();
  }

  async downloadAttachments(
    companyId: number,
    rfqNumber: string,
    source: QuotationFileSource,
  ) {
    const quotation = await this.quotationRepo
      .createQueryBuilder('q')
      .leftJoin('q.quotationNleCompany', 'qnc')
      .innerJoin('q.customer', 'c')
      .innerJoin(
        'q.quotationFiles',
        'qf',
        'qf.companyId = :companyId OR qf.companyId = 0 OR qf.companyId IS NULL',
      )
      .where(
        `
        q.rfqNumber = :rfqNumber
        AND q.status = :status
        AND qf.source = :source
        AND (
          (q.affiliation = :affiliation AND qnc.companyId = :companyId AND qnc.status = :status)
          OR (q.affiliation != :affiliation AND (c.companyId = :companyId OR c.affiliation = :affiliation))
        )
      `,
      )
      .setParameters({
        rfqNumber,
        companyId,
        status: 1,
        source,
        affiliation: 'NLE',
      })
      .select(['q.rfqNumber', 'qf.originalName', 'qf.fileName'])
      .getOne();

    if (!quotation) {
      throw new NotFoundException('Quotation files not found');
    }

    const fileNames = [];
    quotation.quotationFiles.forEach((el) => fileNames.push(el.fileName));
    const bufferFiles = await this.s3Service.downloadFiles(fileNames);

    // compress
    const zipFile = new zip();
    bufferFiles.forEach((el, i) => {
      zipFile.addFile(quotation.quotationFiles[i].originalName, el);
    });

    return zipFile;
  }

  // extend expiration date and
  // accept or reject request extention
  async updateExpiration(
    user: CurrentUserDto,
    rfqNumber: string,
    type: string,
    date?: string,
  ) {
    const quotation = await this.quotationRepo
      .createQueryBuilder('q')
      .leftJoin('q.quotationNleCompany', 'qnc')
      .innerJoin('q.customer', 'c')
      .leftJoin('c.user', 'u', 'u.userStatus = :userStatus', {
        userStatus: 'USERVERIFICATION',
      })
      .innerJoin('c.company', 'ff')
      .leftJoin('q.extendLogs', 'ql')
      .select([
        'q',
        'c.email',
        'ql.date',
        'ql.extendStatus',
        'ff.name',
        'c.id',
        'u.customerLogin',
      ])
      .where(
        `
        q.rfqNumber = :rfqNumber
        AND q.rfqStatus IN (:...rfqStatus)
        AND q.status = :status
        AND (
          (q.affiliation = :affiliation AND qnc.companyId = :companyId AND qnc.status = :status)
          OR (q.affiliation != :affiliation AND (c.companyId = :companyId OR c.affiliation = :affiliation))
        )
      `,
      )
      .setParameters({
        rfqNumber,
        rfqStatus: [RfqStatus.WAITING, RfqStatus.SUBMITTED],
        companyId: user.companyId,
        status: 1,
        affiliation: 'NLE',
      })
      .getOne();

    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    const isNle = quotation.affiliation === 'NLE';

    let bid: Bid;

    if (isNle) {
      bid = await this.bidRepo.findOne({
        rfqId: quotation.id,
        companyId: user.companyId,
        status: 1,
      });

      if (!bid) {
        throw new NotFoundException('Bid not found');
      }
    }

    const customerEmail = quotation.customer.email;

    let extendLog: QuotationExtendLog;

    const notificationBody = {};

    if (type === 'EXTEND' && date) {
      // extend expiration date

      if (isNle) {
        bid.updatedByUserId = user.userId;

        if (bid.validUntil == bid.rfqExpired) {
          bid.validUntil = date;
          bid.rfqExpired = date;
        } else if (
          bid.validUntil > bid.rfqExpired ||
          (!bid.validUntil && bid.rfqExpired)
        ) {
          bid.rfqExpired = date;
        } else if (
          bid.validUntil < bid.rfqExpired ||
          (bid.validUntil && !bid.rfqExpired)
        ) {
          bid.validUntil = date;
        }
      } else {
        quotation.updatedByUserId = user.userId;

        if (quotation.validUntil == quotation.rfqExpired) {
          quotation.validUntil = date;
          quotation.rfqExpired = date;
        } else if (
          quotation.validUntil > quotation.rfqExpired ||
          (!quotation.validUntil && quotation.rfqExpired)
        ) {
          quotation.rfqExpired = date;
        } else if (
          quotation.validUntil < quotation.rfqExpired ||
          (quotation.validUntil && !quotation.rfqExpired)
        ) {
          quotation.validUntil = date;
        }
      }
    } else {
      // accept or reject request extention
      if (isNle) {
        extendLog = await this.quotationExtendLogRepo.findOne({
          where: {
            rfqNumber,
            extendStatus: ExtendStatus.REQUESTED,
            bidId: bid.id,
          },
          order: { id: 'DESC' },
        });

        if (!extendLog) {
          throw new NotFoundException('Request extention not found');
        }

        if (type === 'ACCEPT') {
          extendLog.extendStatus = ExtendStatus.ACCEPTED;
          extendLog.updatedByUserId = user.userId;

          bid.updatedByUserId = user.userId;

          if (bid.validUntil == bid.rfqExpired) {
            bid.validUntil = extendLog.date;
            bid.rfqExpired = extendLog.date;
          } else if (
            bid.validUntil > bid.rfqExpired ||
            (!bid.validUntil && bid.rfqExpired)
          ) {
            bid.rfqExpired = extendLog.date;
          } else if (
            bid.validUntil < bid.rfqExpired ||
            (bid.validUntil && !bid.rfqExpired)
          ) {
            bid.validUntil = extendLog.date;
          }
        } else if (type === 'REJECT') {
          extendLog.extendStatus = ExtendStatus.REJECTED;
          extendLog.updatedByUserId = user.userId;
        }
      } else {
        extendLog = await this.quotationExtendLogRepo.findOne({
          where: { rfqNumber, extendStatus: ExtendStatus.REQUESTED },
          order: { id: 'DESC' },
        });

        if (!extendLog) {
          throw new NotFoundException('Request extention not found');
        }

        if (type === 'ACCEPT') {
          extendLog.extendStatus = ExtendStatus.ACCEPTED;
          extendLog.updatedByUserId = user.userId;

          quotation.updatedByUserId = user.userId;

          if (quotation.validUntil == quotation.rfqExpired) {
            quotation.validUntil = extendLog.date;
            quotation.rfqExpired = extendLog.date;
          } else if (
            quotation.validUntil > quotation.rfqExpired ||
            (!quotation.validUntil && quotation.rfqExpired)
          ) {
            quotation.rfqExpired = extendLog.date;
          } else if (
            quotation.validUntil < quotation.rfqExpired ||
            (quotation.validUntil && !quotation.rfqExpired)
          ) {
            quotation.validUntil = extendLog.date;
          }
        } else if (type === 'REJECT') {
          extendLog.extendStatus = ExtendStatus.REJECTED;
          extendLog.updatedByUserId = user.userId;
        }
      }

      if (user.customerModule || isNle) {
        Object.assign(notificationBody, {
          ffName: quotation.customer.company.name,
          customerId: quotation.customerId,
          type: NotificationType.QUOTATION,
          rfqNumber: quotation.rfqNumber,
          countryFrom: quotation.countryFrom,
          countryTo: quotation.countryTo,
          actionStatus:
            NotificationActionStatus[
              `EXTENTION_QUOTATION_${extendLog.extendStatus}`
            ],
          isRead: false,
          createdAt: new Date(),
          createdBy: user.userId,
        });
      }
    }

    return this.connection.transaction(async (entityManager) => {
      const isCustomerLoginable = quotation.customer.user?.customerLogin;
      delete quotation.customer;
      delete quotation.extendLogs;

      let result;
      if (isNle) {
        result = await entityManager.save(bid);
      } else {
        result = await entityManager.save(quotation);
      }

      if (extendLog) {
        await entityManager.save(extendLog);
      }

      const quotationData = await this.getDownloadData(
        quotation.rfqNumber,
        user
      );
      quotationData.validUntil = result.validUntil;

      if (
        !quotationData.customer.notificationSettingDisabled.find(
          (item) => item.name == 'QUOTATION_EXTEND',
        )
      ) {
        //const pdf = await this.pdfService.createQuotation(quotationData)

        // const origin = await this.originDestinationService.getCityCode(
        //   user.companyId,
        //   quotation.cityFrom,
        // );
        // const destination = await this.originDestinationService.getCityCode(
        //   user.companyId,
        //   quotation.cityTo,
        // );

        const data = {
          type,
          rfqNumber: quotation.rfqNumber,
          customerName: quotationData.customer.fullName,
          customerEmail: quotationData.customer.email,
          origin: quotationData.cityFrom,
          destination: quotationData.cityTo,
          countryFrom: quotationData.countryFrom,
          cityFrom: quotationData.cityFrom,
          countryTo: quotationData.countryTo,
          cityTo: quotationData.cityTo,
          shipmentVia: quotation.shipmentVia,
          ffName: quotationData.company.name,
          ffLogo: quotationData.company.logo,
          ffEmail: quotationData.company.email,
          ffAddress: quotationData.company.address,
          ffPhoneCode: quotationData.company.phoneCode,
          ffPhoneNumber: quotationData.company.phoneNumber,
        };
        if (type === 'EXTEND') {
          data['date'] = format(new Date(date), 'd MMMM yyyy');
        }

        this.mailService.shareQuotation(customerEmail, null, data, true);
      }

      if (
        (user.customerModule &&
          isCustomerLoginable &&
          (type === 'ACCEPT' || type === 'REJECT')) ||
        isNle
      ) {
        this.notificationsService.create(notificationBody);
      }

      return result;
    });
  }

  async checkIdleQuotation() {
    const quotations = await this.quotationRepo
      .createQueryBuilder('q')
      .innerJoin('q.customer', 'c')
      .innerJoin('c.user', 'u')
      .where(
        `
        q.rfqStatus IN (:...rfqStatus)
        AND q.status = :status
        AND c.status = :status
        AND u.customerLogin = :customerLogin
        AND u.status = :status
      `,
      )
      .select([
        'q.rfqNumber AS rfqNumber',
        'q.rfqStatus AS rfqStatus',
        'c.companyId AS companyId',
        `IF (
          DATE(q.validUntil) < DATE(q.rfqExpired),
          q.validUntil,
          COALESCE(q.rfqExpired, q.validUntil)
        ) AS expiredAt`,
      ])
      .setParameters({
        rfqStatus: [RfqStatus.WAITING, RfqStatus.SUBMITTED],
        customerLogin: true,
        status: 1,
      })
      .having(`DATE_ADD(expiredAt, INTERVAL 30 DAY) <= CURRENT_DATE()`)
      .getRawMany();

    quotations.forEach((quotation) => {
      // CASE 1 : waiting (created by customer), tidak di proses lebih lanjut oleh ff
      // CASE 2 : submitted (created by ff), tidak di proses lebih lanjut oleh customer

      const data = {};

      if (quotation.rfqStatus === RfqStatus.WAITING) {
        data['failedByCompanyId'] = quotation.companyId;
      }
      data['rfqStatus'] = RfqStatus.REJECTED;

      this.quotationRepo
        .createQueryBuilder()
        .update()
        .set(data)
        .where(`rfqNumber = :rfqNumber`, { rfqNumber: quotation.rfqNumber })
        .execute();
    });
  }

  async getShipmentVia(rfqNumber: string, companyId: number) {
    return await this.quotationRepo
      .createQueryBuilder('q')
      .leftJoin('q.quotationNleCompany', 'qnc')
      .innerJoin('q.customer', 'c')
      .where(
        `
        q.rfqNumber = :rfqNumber
        AND (
          (q.affiliation = :affiliation AND qnc.companyId = :companyId AND qnc.status = :status)
          OR (q.affiliation != :affiliation AND (c.companyId = :companyId OR c.affiliation = :affiliation))
        )
      `,
      )
      .setParameters({
        rfqNumber,
        companyId,
        affiliation: 'NLE',
        status: 1,
      })
      .select(['q.shipmentVia'])
      .getOne();
  }

  // create check chat room
  async createRoomChatQuotation(rfqNumber, customerId, company: any) {
    const checkCustomerChat = await this.chatCustomerRepo.findOne({
      where: {
        customerId,
        companyId: company.id,
      },
    });

    if (!checkCustomerChat) {
      await this.chatCustomerRepo.save({
        customerId: customerId,
        companyId: company.id,
        updatedAt: new Date(),
      });
    }

    const checkRoom = await this.chatRoomRepo.findOne({ where: { rfqNumber } });

    if (!checkRoom) {
      const chatRoom = this.chatRoomRepo.create({
        customerId,
        companyId: company.id,
        affiliation: company.affiliation,
        types: ChatRoomTypes.QUOTATION,
        rfqNumber,
        unreadMessageFF: 0,
        lastMessage: 'Hello welcome to ' + company.name,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await this.chatRoomRepo.save(chatRoom);

    }
  }

  async updateQuotationWaLimit(rfqNumber: string, user: CurrentUserDto) {
    const quotation = await this.quotationRepo.findOne({ rfqNumber });
    quotation.limitWaFF = quotation.limitWaFF - 1;
    await this.quotationRepo.save(quotation);
  }

  async multipleCompleteQuotation(
    user: CurrentUserDto,
    body: MultipleCompleteQuotationDto,
  ) {
    const quotations = await this.quotationRepo
      .createQueryBuilder('q')
      .innerJoin('q.customer', 'c', 'c.companyId = :companyId')
      .leftJoin('c.user', 'u', 'u.userStatus = :userStatus', {
        userStatus: 'USERVERIFICATION',
      })
      .innerJoin('c.company', 'ff')
      .innerJoin('q.bids', 'b')
      .innerJoin('b.bidprices', 'bp')
      .select([
        'q',
        'b.vendorName',
        'b.shippingLine',
        'bp',
        'c.companyName',
        'c.fullName',
        'c.email',
        'u.customerLogin',
        'ff.name',
      ])
      .where(
        `
        q.rfqNumber IN (:...rfqNumber)
        AND q.rfqStatus IN (:...rfqStatus)
        AND q.status = :status
        AND q.affiliation != :affiliation
      `,
      )
      .setParameters({
        rfqNumber: body.rfqNumber,
        affiliation: 'NLE',
        rfqStatus: [RfqStatus.SUBMITTED],
        companyId: user.companyId,
        status: 1,
      })
      .getMany();

    if (quotations.length == 0) {
      throw new NotFoundException('Quotation not found');
    }

    const company = await this.companiesService.getOne({ id: user.companyId }, [
      'id',
      'name',
      'logo',
      'phoneCode',
      'phoneNumber',
      'address',
      'email',
      'blTerms',
    ]);

    const result = [];

    for (const quotation of quotations) {
      Object.assign(quotation, { updatedByUserId: user.userId });

      quotation.rfqStatus = RfqStatus.COMPLETED;
      quotation.companyId = user.companyId;

      const shipment = this.shipmentRepo.create({
        vendor: quotation.bids[0].vendorName,
        shippingLine: quotation.bids[0].shippingLine,
        customerId: quotation.customerId,
        shipmentService: quotation.shipmentService,
        rfqNumber: quotation.rfqNumber,
        createdByUserId: user.userId,
        createdByCompanyId: user.companyId,
        //blTerms: company.blTerms,
        currency: quotation.currency,
      })

      const sellingPricesValue = [];
      quotation.bids.forEach((bid) => {
        bid.bidprices.forEach((el) => {
          sellingPricesValue.push({
            rfqNumber: quotation.rfqNumber,
            priceComponent: el.priceCompName,
            uom: el.uom,
            price: el.total,
            createdByUserId: user.userId,
          });
        });
      });
      const sellingPrices =
        this.shipmentSellingPriceRepo.create(sellingPricesValue);

      // // sending email
      // const origin = await this.originDestinationService.getCityCode(
      //   user.companyId,
      //   quotation.cityFrom,
      // );
      // const destination = await this.originDestinationService.getCityCode(
      //   user.companyId,
      //   quotation.cityTo,
      // );

      const mailBody = {
        ff: company,
        companyName: quotation.customer.companyName,
        customerName: quotation.customer.fullName,
        email: quotation.customer.email,
        origin: quotation.cityFrom,
        destination: quotation.cityTo,
        shipmentService: quotation.shipmentService,
        isFromDoor:
          quotation.shipmentService === ShipmentService.DTD ||
          quotation.shipmentService === ShipmentService.DTP,
        isToDoor:
          quotation.shipmentService === ShipmentService.DTD ||
          quotation.shipmentService === ShipmentService.PTD,
        otifStatus: 'Booked',
        icons: this.helper.mapOtifIcons(
          quotation.shipmentVia,
          quotation.shipmentService,
          OtifStatus.BOOKED,
        ),
        details: {
          rfqNumber: quotation.rfqNumber,
        },
        ffName: company.name,
        ffLogo: company.logo,
        ffEmail: company.email,
        ffAddress: company.address,
        ffPhoneCode: company.phoneCode,
        ffPhoneNumber: company.phoneNumber,
      };

      mailBody[quotation.shipmentVia] = true;

      const notificationBody = {
        ffName: quotation.customer.company.name,
        customerId: quotation.customerId,
        type: NotificationType.SHIPMENT,
        shipmentVia: quotation.shipmentVia,
        rfqNumber: quotation.rfqNumber,
        countryFrom: quotation.countryFrom,
        countryTo: quotation.countryTo,
        actionStatus: NotificationActionStatus[`OTIF_${OtifStatus.BOOKED}`],
        isRead: false,
        createdAt: new Date(),
        createdBy: user.userId,
      };

      await this.connection.transaction(async (entityManager) => {
        const isCustomerLoginable = quotation.customer.user?.customerLogin;
        delete quotation.customer;
        await entityManager.update(Company, company.id, company);
        delete quotation.bids;

        await entityManager.save(quotation);
        await entityManager.save(sellingPrices);

        result.push(await entityManager.save(shipment));

        this.mailService.submitOtif(mailBody);

        if (user.customerModule && isCustomerLoginable) {
          this.notificationsService.create(notificationBody);
        }

        // set quotation revenue history
        this.quotationRevenueHistoryService.submit(quotation.rfqNumber, quotation.rfqStatus, user);
      });
    }

    return result;
  }

  async getAvailableJobSheet(companyId: number) {
    const query = await this.quotationRepo
      .createQueryBuilder('q')
      .innerJoinAndSelect('q.invoices', 'i','i.invoiceStatus IN (:invoiceStatus) AND i.status = :status')
      .leftJoinAndSelect('q.jobSheet', 'j','j.status = :status')
      .innerJoinAndSelect('q.customer', 'c')
      .where(
        `
        q.companyId = :companyId
        AND j.jobSheetNumber IS NULL
        AND q.status = :status
      `,
      )
      .setParameters({
        companyId,
        invoiceStatus:[InvoiceStatus.ISSUED,InvoiceStatus.SETTLED],
        status: 1,
      })
      .select([
        'q.rfqNumber',
        'q.cityFrom',
        'q.cityTo',
        'c.companyName'
      ])
      .groupBy('q.rfqNumber')
      .orderBy('q.rfqNumber','DESC')
      .getMany();

    const result = [];

    query.map(item=>{
      result.push({
        rfqNumber: item.rfqNumber,
        customerName: item.customer?.companyName,
        cityFrom : item.cityFrom,
        cityTo: item.cityTo,
      })
    })

    return result;
  }

  async requestRemoveFileFromChat(user: CurrentUserDto, rfqNumber: string, body: RequestRemoveFileDto) {
    const shipmentLabel = user.role === RoleFF.STAFF ? ShipmentLabel.NEED_APPROVAL : ShipmentLabel.REVISED;
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const quotation = await queryRunner.manager
        .createQueryBuilder(Quotation, 'q')
        .innerJoinAndSelect('q.company', 'c')
        .innerJoinAndSelect('c.users', 'u')
        .where(`
          q.rfqNumber = :rfqNumber
          AND q.status = :status
          AND u.companyId = :companyId
          AND u.role IN (:userRole)
        `)
        .setParameters({
          companyId: user.companyId,
          userRole: [RoleFF.ADMIN, RoleFF.MANAGER],
          rfqNumber,
          status: 1,
        })
        .getOne();

      const deletedFiles: QuotationFile[] = await this.quotationFileService.requestRemoveFileFromChat(user, rfqNumber, body, queryRunner.manager);
      if (deletedFiles.length < 1) {
        await queryRunner.rollbackTransaction();
        return;
      }

      await this.shipmentHistoryService.requestRemoveFile(user, rfqNumber, {
        description: `${user.role === RoleFF.STAFF ? 'Request Delete Document' : 'Delete Document'}`,
        details: null,
      }, shipmentLabel, queryRunner.manager);

      await queryRunner.commitTransaction();

      if (user.role !== RoleFF.STAFF) {
        const fileUrls = [];
        for (const file of deletedFiles) {
          fileUrls.push(file.url);
        }
        await this.chatService.removeFileChat(fileUrls);
      }

      if (user.role === RoleFF.STAFF) {
        await this.notificationsService.notifyInternalApproval(
          user,
          NotificationType.QUOTATION,
          NotificationActionStatus.REMOVE_FILE_REQUEST,
          {
            rfqNumber
          },
          false,
        );

        let emails = [];
        let files = [];
        for (const user of quotation.company.users) {
          emails.push(user.email);
        }
        for (const file of deletedFiles) {
          const year = file.createdAt.getFullYear();
          const month = file.createdAt.toLocaleString('default', { month: 'short' });
          const day = file.createdAt.getDate();
          let hour = file.createdAt.getHours();
          const minute = file.createdAt.getMinutes();
          let am_pm = hour >= 12 ? "PM" : "AM";
          hour = hour % 12 || 12;

          files.push({
            fileName: file.originalName,
            createdAt: `${day} ${month} ${year}, ${hour}.${minute}${am_pm}`,
          });
        }

        await this.mailService.informRemoveDocument(emails, {
          ffLogo: quotation.company.logo,
          ffName: quotation.company.name,
          files,
          ffAddress: quotation.company.address,
          ffPhoneCode: quotation.company.phoneCode,
          ffPhoneNumber: quotation.company.phoneNumber,
          ffEmail: quotation.company.email,
        });
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateRevenueNote(
    user: CurrentUserDto,
    rfqNumber: string,
    body: UpdateRevenueNoteQuotation,
  ) {
    const quotation = await this.quotationRepo
      .createQueryBuilder('q')
      .innerJoin('q.customer', 'c')
      .where(
        `
        q.rfqNumber = :rfqNumber
        AND q.status = :status
        AND c.companyId = :companyId
      `,
      )
      .setParameters({
        rfqNumber,
        companyId: user.companyId,
        status: 1,
      })
      .getOne();

    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    return this.connection.transaction(async (entityManager) => {
      Object.assign(quotation,{...body});
      return await entityManager.save(quotation);
    });
  }
}
