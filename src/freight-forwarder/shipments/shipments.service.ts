import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Injectable, NotFoundException, UnauthorizedException, BadRequestException, } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, Repository } from 'typeorm';
import { format } from 'date-fns';
import * as crypto from 'crypto';

import {
  EAffiliation,
  InvoiceStatus,
  NotificationActionStatus,
  NotificationType,
  OtifStatus,
  QuotationFileSource,
  RfqStatus,
  ShipmentStatus,
  ShipmentType,
  ShipmentVia,
} from 'src/enums/enum';

import { UpdateShipmentDto } from './dtos/update-shipment.dto';
import { CurrentUserDto } from '../auth/dtos/current-user.dto';

import { Shipment } from 'src/entities/shipment.entity';
import { Quotation } from 'src/entities/quotation.entity';
import { ShipmentOtif } from 'src/entities/shipment-otif.entity';
import { ShipmentSelllingPrice } from 'src/entities/shipment-selling-price.entity';
import { BidPrice } from 'src/entities/bid-price.entity';

import { Helper } from '../helpers/helper';
import { NotificationsService } from '../notifications/notifications.service';
import { CompaniesService } from '../companies/companies.service';
import { Company } from 'src/entities/company.entity';
import { S3Service } from '../../s3/s3.service';
import { BlHistory } from '../../entities/bl-history.entity';
import NotificationSchedulingService from '../notification-scheduling/notification-scheduling.service';
import { UsersService } from '../users/users.service';
import { PdfService } from '../../pdf/pdf.service';
import { HttpService } from '@nestjs/axios';
import * as zip from 'adm-zip';
import { ShipmentFilesService } from '../shipment-files/shipment-files.service';
import { ShipmentHistoryService } from '../shipment-history/shipment-history.service';
import { RequestRemoveFileDto } from './dtos/request-remove-file.dto';
import { MailService } from '../../mail/mail.service';
import { RoleFF, FileStatus, ShipmentLabel } from '../../enums/enum';
import { ShipmentFile } from '../../entities/shipment-file.entity';
import { RespondRemoveFileDto } from './dtos/respond-remove-file.dto';
import { QuotationFilesService } from '../quotation-files/quotation-files.service';
import { QuotationFile } from '../../entities/quotation-file.entity';
import { ChatService } from '../chat/chat.service';
import { CeisaService } from '../ceisa/ceisa.service';
import { QuotationRevenueHistoryService } from '../quotation-revenue-history/quotation-revenue-history.service';

@Injectable()
export class ShipmentsService {
  constructor(
    @InjectRepository(Shipment) private shipmentRepo: Repository<Shipment>,
    @InjectRepository(Quotation) private quotationRepo: Repository<Quotation>,
    @InjectRepository(ShipmentOtif)
    private shipmentOtifRepo: Repository<ShipmentOtif>,
    @InjectRepository(BlHistory)
    private blHistoryRepo: Repository<BlHistory>,
    private connection: Connection,
    private helper: Helper,
    private notificationsService: NotificationsService,
    private companiesService: CompaniesService,
    private readonly s3Service: S3Service,
    private readonly notificationSchedulingService: NotificationSchedulingService,
    private readonly userService: UsersService,
    private readonly pdfService: PdfService,
    private readonly httpService: HttpService,
    private readonly shipmentFilesService: ShipmentFilesService,
    private readonly shipmentHistoryService: ShipmentHistoryService,
    private readonly mailservice: MailService,
    private readonly quotationFileService: QuotationFilesService,
    private readonly chatService: ChatService,
    private ceisaService: CeisaService,
    @InjectRepository(ShipmentSelllingPrice)
    private shipmentSellingPriceRepo: Repository<ShipmentSelllingPrice>,
    @InjectRepository(BidPrice) private bidPriceRepo: Repository<BidPrice>,
    private readonly quotationRevenueHistoryService: QuotationRevenueHistoryService,
  ) {}

  // step 3 or 4 => both will lead quotation submitted
  async create(user: CurrentUserDto, rfqNumber: string) {
    try {
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
        .innerJoin('q.bids', 'b')
        .leftJoin('q.quotationNleCompany', 'qnc')
        .select([
          'q.id',
          'q.rfqNumber',
          'q.customerId',
          'q.shipmentVia',
          'q.shipmentService',
          'q.shipmentType',
          'q.rfqStatus',
          'q.shipperName',
          'q.shipperCompany',
          'q.shipperPhoneCode',
          'q.shipperPhone',
          'q.shipperTaxId',
          'q.shipperEmail',
          'q.shipperZipCode',
          'q.shipperAddress',
          'q.consigneeName',
          'q.consigneeCompany',
          'q.consigneePhoneCode',
          'q.consigneePhone',
          'q.consigneeTaxId',
          'q.consigneeEmail',
          'q.consigneeZipCode',
          'q.consigneeAddress',
          'q.countryFrom',
          'q.countryFromCode',
          'q.cityFrom',
          'q.countryTo',
          'q.countryToCode',
          'q.cityTo',
          'b.vendorName',
          'b.shippingLine',
          'c.companyName',
          'c.email',
          'u.customerLogin',
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
          rfqStatus: [RfqStatus.DRAFT],
          companyId: user.companyId,
          status: 1,
        })
        .getOne();

      if (!quotation) {
        throw new NotFoundException('Quotation not found');
      }

      return await this.connection.transaction(async (entityManager) => {
        delete quotation.bids;
        quotation.rfqStatus = RfqStatus.SUBMITTED;
        const result = await entityManager.save(quotation);

        const notificationBody = {
          customerId: quotation.customerId,
          type: NotificationType.QUOTATION,
          rfqNumber: rfqNumber,
          countryFromCode: quotation.countryFromCode,
          countryFrom: quotation.countryFrom,
          countryToCode: quotation.countryToCode,
          countryTo: quotation.countryTo,
          actionStatus: NotificationActionStatus.QUOTATION_SUBMITTED,
          isRead: false,
          createdAt: new Date(),
          createdBy: user.userId,
        };

        // Shipment Notification
        this.notificationsService.create(notificationBody);

        // set quotation revenue history
        this.quotationRevenueHistoryService.submit(quotation.rfqNumber, quotation.rfqStatus, user);

        return result;
      });
    } catch (error) {
      throw error;
    }
  }

  // Update Fungsi ini untuk Buat History HBL
  async update(
    user: CurrentUserDto,
    rfqNumber: string,
    body: UpdateShipmentDto,
  ) {
    const shipment = await this.shipmentRepo.findOne({
      rfqNumber,
      status: 1,
    });
    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    let quotationPayload;
    if (body.quotation) {
      quotationPayload = body.quotation;
    }

    const company = await this.companiesService.getOne({ id: user.companyId }, [
      'id',
      'blTerms',
    ]);
    company.blTerms = body.blTerms;

    let shipmentOtif;
    if (shipment.otifStatus === OtifStatus.DEPARTURE) {
      shipmentOtif = await this.shipmentOtifRepo.findOne({
        rfqNumber,
        otifStatus: OtifStatus.DEPARTURE,
        status: 1,
      });

      shipmentOtif.masterAwb = body.masterBl;
      shipmentOtif.houseAwb = body.houseBl;
    }

    Object.assign(shipment, body, { updatedByUserId: user.userId });

    const update = await this.connection.transaction(async (entityManager) => {
      if (shipmentOtif) {
        await entityManager.save(shipmentOtif);
      }

      await entityManager.update(Company, company.id, company);
      return await entityManager.save(shipment);
    });

    const shipmentDetails = await this.getDetail(user, update.rfqNumber);
    const generatedBlFile = await this.pdfService.createInvoiceJobsheet(
      shipmentDetails,
      true,
    );

    const uploadParams = {
      mimeType: 'application/pdf',
      fileName: `${crypto.randomBytes(32).toString('hex')}.pdf`,
      buffer: generatedBlFile,
    };

    let uploadUrl: string;

    if (quotationPayload) {
      const quotation = await this.quotationRepo.findOne({
        where: { rfqNumber },
      });

      await this.quotationRepo.save({
        ...quotation,
        ...quotationPayload,
      });
    }

    if (update.blTemplateType === 'CUSTOM') {
      if (!update.customHouseBlFile) {
        uploadUrl = await this.s3Service.uploadBlTemplate(uploadParams);
      } else {
        const blFileName = [update.customHouseBlFile.split('/').pop()];

        await this.s3Service.deleteFiles(blFileName);
        uploadUrl = await this.s3Service.uploadBlTemplate(uploadParams);
      }
      update.customHouseBlFile = uploadUrl;
    } else {
      if (!update.houseBlFile) {
        uploadUrl = await this.s3Service.uploadBlTemplate(uploadParams);
      } else {
        const blFileName = [update.houseBlFile.split('/').pop()];

        await this.s3Service.deleteFiles(blFileName);
        uploadUrl = await this.s3Service.uploadBlTemplate(uploadParams);
      }
      update.houseBlFile = uploadUrl;
    }

    return await this.shipmentRepo.save(update);
  }

  async getPaged(
    page: number,
    perpage: number,
    shipmentStatus: ShipmentStatus,
    otifStatus: OtifStatus,
    shipmentVia: ShipmentVia,
    shipmentType: ShipmentType,
    createdAt: string,
    search: string,
    isCeisa: boolean,
    user: CurrentUserDto,
    shipmentLabel: ShipmentLabel,
  ) {
    const limit = perpage;
    const offset = limit * (page - 1);

    const query = this.shipmentRepo
      .createQueryBuilder('s')
      .innerJoin('s.customer', 'c')
      .innerJoin('s.quotation', 'q')
      .leftJoin('s.shipmentOtifs', 'so', 'so.otifStatus = s.otifStatus')
      .leftJoin('s.invoices', 'i', 'i.invoiceStatus != :invoiceStatus', {
        invoiceStatus: InvoiceStatus.PROFORMA,
      })
      .where(
        `
        s.shipmentStatus = :shipmentStatus
        AND s.status = :status
        AND ${ !user.isTrial ? `q.companyId = :companyId` : `(q.companyId = :companyId OR q.affiliation = :dummyAffiliation)`}
        AND q.status = :status
      `,
      )
      .select([
        's.shipmentStatus AS shipmentStatus',
        's.otifStatus AS otifStatus',
        's.label AS shipmentLabel',
        `DATE_FORMAT(s.createdAt, '%Y-%m-%d') AS createdAt`,
        'c.companyName AS companyName',
        'q.affiliation AS affiliation',
        'q.rfqNumber AS rfqNumber',
        'q.rfqStatus AS rfqStatus',
        'q.shipmentVia AS shipmentVia',
        'q.shipmentService AS shipmentService',
        'q.shipmentType AS shipmentType',
        'q.countryFrom AS countryFrom',
        'q.cityFrom AS cityFrom',
        'q.countryTo AS countryTo',
        'q.cityTo AS cityTo',
        `IF (
          so.location = '',
          'No Location',
          COALESCE(so.location, 'No Location')
        ) AS location`,
        `IF (
          so.activity = '',
          'No Activity',
          COALESCE(so.activity, 'No Activity')
        ) AS activity`,
        'i.invoiceStatus AS invoiceStatus',
        's.isCeisa AS isCeisa',
        'IF(s.hblDynamic IS NULL, false, true ) AS isHblDynamic',
      ])
      .setParameters({
        shipmentStatus,
        companyId: user.companyId,
        dummyAffiliation: EAffiliation.DUMMY,
        status: 1,
      })
      .groupBy('s.rfqNumber')
      .orderBy('s.updatedAt', 'DESC');

    if (otifStatus) {
      query.andWhere('s.otifStatus = :otifStatus', { otifStatus });
    }

    if (shipmentVia) {
      query.andWhere('q.shipmentVia = :shipmentVia', { shipmentVia });
    }

    if (shipmentLabel) {
      query.andWhere('s.label = :shipmentLabel', { shipmentLabel });
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
        `(DATE(s.createdAt) >= :from AND DATE(s.createdAt) <= :until)`,
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
            OR s.houseBl like :search
            OR so.houseAwb like :search
          )`,
        { search: `%${search}%` },
      );
    }

    if (isCeisa) {
      query.andWhere('s.isCeisa = :isCeisa', { isCeisa });
    }

    const shipments = await query.getRawMany();
    const totalRecord = shipments.length;

    const data = await query.offset(offset).limit(limit).getRawMany();
    const totalShowed = data.length;

    data.forEach((el) => {
      el.percentage = this.helper.getShipmentPercentage(
        el.shipmentService,
        el.otifStatus,
      );
    });

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

  async getDetail(user: CurrentUserDto, rfqNumber: string) {
    const shipment = await this.shipmentRepo
      .createQueryBuilder('s')
      .innerJoinAndSelect('s.customer', 'c')
      .innerJoin('c.user', 'uc')
      .innerJoinAndSelect('s.quotation', 'q')
      .leftJoinAndSelect(
        'q.quotationFiles',
        'quotationFiles',
        'quotationFiles.status = :status',
      )
      .leftJoinAndSelect('s.shipmentOtifs', 'o', 'o.status = :status')
      .leftJoinAndSelect(
        's.shipmentFiles',
        'shipmentFiles',
        'shipmentFiles.status = :status',
      )
      .innerJoin('s.shipmentSellingPrice', 'ssp')
      .leftJoinAndSelect('q.company', 'company')
      .leftJoin('s.blCountry', 'blCountry')
      .leftJoin('s.blCity', 'blCity')
      .leftJoin('s.shipmentDelays', 'shipmentDelays')
      .leftJoin('s.shipmentDelayFiles', 'delayFiles')
      .leftJoinAndSelect('s.hblDynamicShipmentHistories', 'hblh','hblh.rfqNumber IS NOT NULL AND hblh.status = :status')
      .leftJoinAndSelect('hblh.creator', 'hblhc')
      .where(
        `
        s.rfqNumber = :rfqNumber
        AND s.status = :status
        AND ${
          !user.isTrial
            ? `q.companyId = :companyId`
            : `(q.companyId = :companyId OR q.affiliation = :dummyAffiliation)`
        }
        AND q.status = :status
        AND ssp.rfqNumber = :rfqNumber
        AND ssp.status = :status
      `)
      .setParameters({
        rfqNumber,
        companyId: user.companyId,
        status: 1,
        dummyAffiliation: EAffiliation.DUMMY,
      })
      .addSelect([
        'shipmentDelays.otifStatus',
        'shipmentDelays.delayDate',
        'shipmentDelays.estimatedDelayUntil',
        'shipmentDelays.note',
        'delayFiles.otifStatus',
        'delayFiles.id',
        'delayFiles.originalName',
        'delayFiles.url',
        'uc.photo',
        'blCountry.countryName',
        'blCountry.countryCode',
        'blCity.cityName',
        'blCity.cityCode',
        'company.hblTemplate',
        'hblh.createdAt',
        'hblh.activity',
        'hblhc.fullName',
        'ssp.type',
        'ssp.priceComponent',
        'ssp.uom',
        'ssp.price',
        'ssp.convertedPrice',
        'ssp.qty',
        'ssp.subtotal',
        'ssp.subtotalCurrency',
        'ssp.note',
      ])
      .getOne();

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    const status = {
      rfqNumber: shipment.rfqNumber,
      rfqStatus: shipment.quotation.rfqStatus,
      shipmentStatus: shipment.shipmentStatus,
      otifStatus: shipment.otifStatus,

      shipmentVia: shipment.quotation.shipmentVia,
      shipmentType: shipment.quotation.shipmentType,
      shipmentService: shipment.quotation.shipmentService,
      createdAt: format(shipment.createdAt, 'yyyy-MM-dd'),
      countryFrom: shipment.quotation.countryFrom,
      cityFrom: shipment.quotation.cityFrom,
      addressFrom: shipment.quotation.addressFrom,
      countryTo: shipment.quotation.countryTo,
      cityTo: shipment.quotation.cityTo,
      addressTo: shipment.quotation.addressTo,
    };

    if (shipment.shipmentStatus == ShipmentStatus.FAILED) {
      Object.assign(status, {
        shipmentOtifs: [
          {
            reasonFailed: shipment.shipmentOtifs[0].reasonFailed,
            otifStatus: shipment.shipmentOtifs[0].otifStatus,
            updatedAt: format(
              shipment.shipmentOtifs[0].updatedAt,
              'yyyy-MM-dd HH:mm:ss',
            ),
            status: shipment.shipmentOtifs[0].status,
          },
        ],
      });
    } else {
      Object.assign(status, {
        shipmentOtifs: [
          {
            otifStatus: 'BOOKED',
            updatedAt: format(shipment.createdAt, 'yyyy-MM-dd HH:mm:ss'),
          },
          ...this.helper.mapOtifResponse(shipment.shipmentOtifs, shipment),
        ],
        shipmentDelays: this.helper.mapOtifDelayResponse(
          shipment.shipmentDelays,
          shipment.shipmentDelayFiles,
        ),
      });
    }

    const quotationFiles = [];
    const quotationFilesChat = [];

    shipment.quotation.quotationFiles.map((item) => {
      if (item.source == QuotationFileSource.CHAT) {
        quotationFilesChat.push(item);
      } else {
        quotationFiles.push(item);
      }
    });

    const details = {
      // carrier information
      shippingLine: shipment.shippingLine,
      vendor: shipment.vendor,
      masterBl: shipment.masterBl,
      masterBlType: shipment.masterBlType,
      houseBl: shipment.houseBl,
      houseBlType: shipment.houseBlType,
      terms: shipment.terms,
      containerNumber: shipment.containerNumber,
      voyageName: shipment.voyageName,
      voyageNumber: shipment.voyageNumber,
      blFreightAmount: shipment.blFreightAmount,
      blFreightPayable: shipment.blFreightPayable,
      blInsurance: shipment.blInsurance,
      blCountryId: shipment.blCountryId,
      blCityId: shipment.blCityId,
      blCountryName: shipment?.blCountry?.countryName ?? null,
      blCityName: shipment?.blCity?.cityName ?? null,
      blCountryCode: shipment?.blCountry?.countryCode ?? null,
      blCityCode: shipment?.blCity?.cityCode ?? null,
      blTerms: shipment.blTerms,
      blPrepaidType: shipment.blPrepaidType,
      blCollectType: shipment.blCollectType,
      blTemplateType: shipment.blTemplateType,
      blDocumentType: shipment.blDocumentType,
      blBookingNumber: shipment.blBookingNumber,
      blReferences: shipment.blReferences,
      blExportReferences: shipment.blExportReferences,
      blShipperAddress: shipment.blShipperAddress,
      blConsigneeAddress: shipment.blConsigneeAddress,
      blNotifyPartyAddress: shipment.blNotifyPartyAddress,
      blDeliveryAgent: shipment.blDeliveryAgent,
      blExportVessel: shipment.blExportVessel,
      blPlaceOfReceipt: shipment.blPlaceOfReceipt,
      blPlaceOfDelivery: shipment.blPlaceOfDelivery,
      blMarkAndNumber: shipment.blMarkAndNumber,
      blDescOfGoods: shipment.blDescOfGoods,
      blNumberOfBl: shipment.blNumberOfBl,
      blNumberOfPackages: shipment.blNumberOfPackages,
      blPackagesUnit: shipment.blPackagesUnit,
      blGrossWeight: shipment.blGrossWeight,
      blWeightUnit: shipment.blWeightUnit,
      blVolumetric: shipment.blVolumetric,
      blVolumetricUnit: shipment.blVolumetricUnit,
      blAsAgentFor: shipment.blAsAgentFor,
      blReceiptDate: shipment.blReceiptDate,
      blDescOfRatesAndCharges: shipment.blDescOfRatesAndCharges,
      defaultHblUrl: shipment.houseBlFile,
      customHblUrl: shipment.customHouseBlFile
        ? shipment.customHouseBlFile
        : await this.blHistoryRepo
            .find({
              companyId: user.companyId,
            })
            .then((res) => {
              const found = res.find((el) => el.status === 'DONE');
              if (found) return found.url;

              return null;
            }),
      mblFile: shipment.masterBlFile,
      mblHistory: shipment.blHistory.filter((el) => el.blType === 'MBL'),
      hblHistory: shipment.blHistory.filter((el) => el.blType === 'HBL'),
      hblUploadStatus: await this.blHistoryRepo
        .find({
          companyId: user.companyId,
        })
        .then((res) => (res.length > 0 ? true : false)),
      hblDocumentReadiness: await this.blHistoryRepo
        .find({
          companyId: user.companyId,
        })
        .then((res) =>
          res.filter((el) => el.status === 'DONE').length > 0
            ? 'READY'
            : 'NOT READY',
        ),
      hblField: shipment.quotation.company.hblField,
      htmlTemplate: shipment.quotation.company.hblApprovedTemplate,
      company: {
        id: shipment.quotation.company.id,
        name: shipment.quotation.company.name,
        email: shipment.quotation.company.email,
        address: shipment.quotation.company.address,
        phoneCode: shipment.quotation.company.phoneCode,
        phoneNumber: shipment.quotation.company.phoneNumber,
        logo: shipment.quotation.company.logo,
      },
      // shipping
      customer: {
        customerId: shipment.customerId,
        companyName: shipment.customer.companyName,
        fullName: shipment.customer.fullName,
        photo: shipment.customer.user?.photo ?? null,
      },
      rfqNumber: shipment.quotation.rfqNumber,
      shipmentVia: shipment.quotation.shipmentVia,
      shipmentService: shipment.quotation.shipmentService,
      countryFrom: shipment.quotation.countryFrom,
      countryFromCode: shipment.quotation.countryFromCode,
      cityFrom: shipment.quotation.cityFrom,
      portOfLoading: shipment.quotation.portOfLoading,
      addressFrom: shipment.quotation.addressFrom,
      zipcodeFrom: shipment.quotation.zipcodeFrom,
      countryTo: shipment.quotation.countryTo,
      countryToCode: shipment.quotation.countryToCode,
      cityTo: shipment.quotation.cityTo,
      portOfDischarge: shipment.quotation.portOfDischarge,
      addressTo: shipment.quotation.addressTo,
      zipcodeTo: shipment.quotation.zipcodeTo,
      customerPosition: shipment.quotation.customerPosition,
      routeType: shipment.quotation.routeType,
      shipmentDate: shipment.quotation.shipmentDate,
      // shipment type
      shipmentType: shipment.quotation.shipmentType,
      totalQty: shipment.quotation.totalQty,
      estimatedTotalWeight: shipment.quotation.estimatedTotalWeight,
      volumetric: shipment.quotation.volumetric,
      volumetricUnit: shipment.quotation.volumetricUnit,
      packingList: shipment.quotation.packingList,
      // product type
      productType: shipment.quotation.productType,
      kindOfGoods: shipment.quotation.kindOfGoods,
      valueOfGoods: shipment.quotation.valueOfGoods,
      currency: shipment.quotation.currency,
      hsCode: shipment.quotation.hsCode,
      poNumber: shipment.quotation.poNumber,
      unNumber: shipment.quotation.unNumber,
      description: shipment.quotation.description,
      quotationFiles: this.helper.mapFileResponse(quotationFiles),
      quotationFilesChat: this.helper.mapFileResponse(quotationFilesChat),
      // additional
      remark: shipment.quotation.remark,
      originCustomsClearance: shipment.quotation.originCustomsClearance,
      destinationCustomsClearance:
        shipment.quotation.destinationCustomsClearance,
      warehouseStorage: shipment.quotation.warehouseStorage,
      // shipper details
      shipperName: shipment.quotation.shipperName,
      shipperCompany: shipment.quotation.shipperCompany,
      shipperPhoneCode: shipment.quotation.shipperPhoneCode,
      shipperPhone: shipment.quotation.shipperPhone,
      shipperTaxId: shipment.quotation.shipperTaxId,
      shipperEmail: shipment.quotation.shipperEmail,
      shipperZipCode: shipment.quotation.shipperZipCode,
      shipperAddress: shipment.quotation.shipperAddress,
      shipperNpwp: shipment.quotation.company.npwp,

      //consignee details
      consigneeName: shipment.quotation.consigneeName,
      consigneeCompany: shipment.quotation.consigneeCompany,
      consigneePhoneCode: shipment.quotation.consigneePhoneCode,
      consigneePhone: shipment.quotation.consigneePhone,
      consigneeTaxId: shipment.quotation.consigneeTaxId,
      consigneeEmail: shipment.quotation.consigneeEmail,
      consigneeZipCode: shipment.quotation.consigneeZipCode,
      consigneeAddress: shipment.quotation.consigneeAddress,

      //ceisa
      isCeisa: shipment.isCeisa,

      //hbl dynamic
      hblDynamicShipmentHistories: [],
      hblDynamicDefault: shipment.hblDynamicDefault,
      isHblDynamic: shipment.hblDynamic ? true : false,

      // selling prices
      sellingPrices: shipment.shipmentSellingPrice,
    };

    shipment.hblDynamicShipmentHistories.map(item =>{
      details.hblDynamicShipmentHistories.push({
        activity: item.activity,
        createdAt: item.createdAt,
        creator: {
          fullName: item.creator?.fullName,
        },
      })
    })

    let isPendingRequest = false;

    for (const file of shipment.shipmentFiles) {
      if (file.fileStatus === FileStatus.REQUEST_DELETE) {
        isPendingRequest = true;
        break;
      }
    }

    let isPendingRequestChat = false;
    for (const file of shipment.quotation.quotationFiles) {
      if (file.fileStatus === FileStatus.REQUEST_DELETE && file.source === 'CHAT') {
        isPendingRequestChat = true;
        break;
      }
    }
    
    return {
      status,
      details,
      documents: this.helper.mapFileResponse(shipment.shipmentFiles),
      isPendingRequest,
      isPendingRequestChat,
    };
  }

  async getOne(payload: object, select?) {
    return await this.shipmentRepo.findOne(
      { ...payload },
      { select: select ?? ['id'] },
    );
  }

  async updateHblFile(rfqNumber: string, hblFile: string) {
    try {
      const shipment = await this.shipmentRepo.findOne({ rfqNumber });
      if (!shipment) throw new NotFoundException('Shipment not found');
      shipment.houseBlFile = hblFile;

      return await this.shipmentRepo.save(shipment);
    } catch (err) {
      throw err;
    }
  }

  async downloadFile(companyId: number, rfqNumber: string, fileName: string) {
    return await this.shipmentRepo
      .createQueryBuilder('s')
      .innerJoin('s.quotation', 'q')
      .innerJoin('s.shipmentFiles', 'sf')
      .where(
        `
        s.rfqNumber = :rfqNumber
        AND s.status = :status
        AND q.companyId = :companyId
        AND sf.fileName = :fileName
        `,
        { rfqNumber, companyId, status: 1, fileName },
      )
      .getCount();
  }

  async getBlHistory(rfqNumber: string) {
    try {
      const shipment = await this.shipmentRepo.findOne({ rfqNumber });
      if (!shipment) throw new NotFoundException();

      return shipment.blHistory;
    } catch (err) {
      throw err;
    }
  }

  async updateMblFile(
    updatedBy: string,
    rfqNumber: string,
    masterBlNumber: string,
    masterBlType: string,
    masterBlFile: string,
  ) {
    try {
      const shipment = await this.shipmentRepo.findOne({ rfqNumber });
      if (!shipment) throw new NotFoundException();

      shipment.masterBl = masterBlNumber;
      shipment.masterBlType = masterBlType;
      shipment.masterBlFile = masterBlFile;
      shipment.blHistory.push({
        dateTime: new Date(),
        blType: 'MBL',
        activity: 'Upload MBL Document',
        updatedBy,
      });

      return await this.shipmentRepo.save(shipment);
    } catch (err) {
      throw err;
    }
  }

  async downloadMblFile(rfqNumber: string, response: any) {
    try {
      const shipment = await this.shipmentRepo.findOne({ rfqNumber });
      if (!shipment) throw new NotFoundException();

      const fileName = shipment.masterBlFile;

      return await this.s3Service.downloadFile(fileName, response);
    } catch (err) {
      throw err;
    }
  }

  async downloadAttachments(
    companyId: number,
    rfqNumber: string,
  ) {
    const shipment = await this.shipmentRepo
      .createQueryBuilder('s')
      .innerJoinAndSelect('s.shipmentFiles', 'sf')
      .innerJoinAndSelect('s.quotation', 'q')
      .where(`
        s.rfqNumber = :rfqNumber
        AND s.status = :status
        AND q.companyId = :companyId
        AND q.status = :status
      `)
      .setParameters({
        rfqNumber,
        status: 1,
        companyId,
      })
      .getOne();

    if (!shipment) {
      throw new NotFoundException('Shipment files not found');
    }

    const fileNames = [];
    shipment.shipmentFiles.forEach((el) => fileNames.push(el.fileName));
    const bufferFiles = await this.s3Service.downloadFiles(fileNames);

    // compress
    const zipFile = new zip();
    bufferFiles.forEach((el, i) => {
      zipFile.addFile(shipment.shipmentFiles[i].originalName, el);
    });

    return zipFile;
  }

  async requestRemoveFile (user: CurrentUserDto, rfqNumber: string, body: RequestRemoveFileDto) {
    const shipmentLabel = user.role === RoleFF.STAFF ? ShipmentLabel.NEED_APPROVAL : ShipmentLabel.REVISED;
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const shipment = await queryRunner.manager.createQueryBuilder(Shipment, 's')
        .innerJoinAndSelect('s.quotation', 'q')
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

      const deletedFiles = await this.shipmentFilesService.requestRemoveFile(user, rfqNumber, body, queryRunner.manager);
      if (deletedFiles.length < 1) {
        await queryRunner.rollbackTransaction();
        return;
      }
      await this.shipmentHistoryService.requestRemoveFile(user, rfqNumber, {
        description: `${user.role === RoleFF.STAFF ? 'Request Delete Document' : 'Delete Document'}`,
        details: null,
      }, shipmentLabel, queryRunner.manager);

      await queryRunner.commitTransaction();

      if (user.role === RoleFF.STAFF) {
        await this.notificationsService.notifyInternalApproval(
          user,
          NotificationType.SHIPMENT,
          NotificationActionStatus.REMOVE_FILE_REQUEST,
          {
            rfqNumber,
          },
          false,
        );

        let emails = [];
        let files = [];
        for (const user of shipment.quotation.company?.users) {
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

        await this.mailservice.informRemoveDocument(emails, {
          ffLogo: shipment.quotation.company?.logo,
          ffName: shipment.quotation.company?.name,
          files,
          rfqNumber,
          ffAddress: shipment.quotation.company?.address,
          ffPhoneCode: shipment.quotation.company?.phoneCode,
          ffPhoneNumber: shipment.quotation.company?.phoneNumber,
          ffEmail: shipment.quotation.company?.email,
        });
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

  }

  async getRequestRemoveFile (user: CurrentUserDto, rfqNumber: string) {
    const shipment = await this.shipmentRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.shipmentFiles', 'sf', 'sf.fileStatus = :fileStatus')
      .innerJoinAndSelect('s.quotation', 'q')
      .leftJoinAndSelect('q.quotationFiles', 'qf', 'qf.fileStatus = :fileStatus AND qf.source = :quotationFileSource')
      .where(`
        s.rfqNumber = :rfqNumber
        AND s.status = :status
        AND q.status = :status
      `)
      .setParameters({
        rfqNumber,
        status: 1,
        fileStatus: FileStatus.REQUEST_DELETE,
        quotationFileSource: 'CHAT',
      })
      .getOne();

    if (!shipment) {
      throw new NotFoundException('Shipment is not found');
    }

    const result = [];

    shipment.shipmentFiles.forEach((file) => {
      const year = file.createdAt.getFullYear();
      const month = file.createdAt.toLocaleString('default', { month: 'short' });
      const day = file.createdAt.getDate();
      let hour = file.createdAt.getHours();
      const minute = file.createdAt.getMinutes();
      let am_pm = hour >= 12 ? "PM" : "AM";
      hour = hour % 12 || 12;

      result.push({
        id: file.id,
        fileName: file.originalName,
        dateTime: `${day} ${month} ${year}, ${hour}.${minute}${am_pm}`,
        fileSource: 'SHIPMENT',
      })
    });

    shipment.quotation.quotationFiles.forEach((file) => {
      const year = file.createdAt.getFullYear();
      const month = file.createdAt.toLocaleString('default', { month: 'short' });
      const day = file.createdAt.getDate();
      let hour = file.createdAt.getHours();
      const minute = file.createdAt.getMinutes();
      let am_pm = hour >= 12 ? "PM" : "AM";
      hour = hour % 12 || 12;

      result.push({
        id: file.id,
        fileName: file.originalName,
        dateTime: `${day} ${month} ${year}, ${hour}.${minute}${am_pm}`,
        fileSource: 'CHAT',
      })
    });

    return result;
  }

  async respondRequestRemoveFile(user: CurrentUserDto, rfqNumber: string, body: RespondRemoveFileDto) {
    if (user.role !== RoleFF.ADMIN && user.role !== RoleFF.MANAGER) {
      throw new UnauthorizedException('Staff may not respond to file removal request');
    }
    const shipmentAttachmentIds = [];
    const chatAttachmentIds = [];
    const shipmentLabel = body.approved ? ShipmentLabel.REVISED : ShipmentLabel.CHANGES_REJECTED;
    const actionStatus = body.approved ? NotificationActionStatus.REMOVE_FILE_APPROVED : NotificationActionStatus.REMOVE_FILE_REJECT;

    for (const ids of body.attachmentIds) {
      if (ids.fileSource === 'SHIPMENT') {
        shipmentAttachmentIds.push(ids.id);
      }
      else if (ids.fileSource === 'CHAT') {
        chatAttachmentIds.push(ids.id);
      }
    }

    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const shipment = await queryRunner.manager.createQueryBuilder(Shipment, 's')
        .innerJoinAndSelect('s.quotation', 'q')
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

      const shipmentDeletedFiles: ShipmentFile[] = await this.shipmentFilesService.respondRemoveFile(
        shipmentAttachmentIds,
        rfqNumber,
        user.companyId,
        body.approved,
        queryRunner.manager
      );

      const chatDeletedFiles: QuotationFile[] = await this.quotationFileService.respondRemoveFileFromChat(
        chatAttachmentIds,
        rfqNumber,
        user.companyId,
        body.approved,
        queryRunner.manager
      );

      if (shipmentDeletedFiles.length < 1 && chatDeletedFiles.length < 1) {
        await queryRunner.rollbackTransaction();
        return;
      }

      await this.shipmentHistoryService.requestRemoveFile(user, rfqNumber, {
        description: `${body.approved ? 'Approve' : 'Reject'} Delete Document`,
        details: null,
      }, shipmentLabel, queryRunner.manager);

      await queryRunner.commitTransaction();

      const staffIds = new Set();
      const attachmentUrls = [];

      shipmentDeletedFiles.forEach((file) => {
        staffIds.add(file.createdByUserId);
      });

      chatDeletedFiles.forEach((file) => {
        staffIds.add(file.createdByUserId);
        attachmentUrls.push(file.url);
      });

      const notificationType = shipmentAttachmentIds.length > 0 ? NotificationType.SHIPMENT : NotificationType.QUOTATION;

      await this.notificationsService.notifyInternalApproval(
        user,
        notificationType,
        actionStatus,
        {
          rfqNumber,
        },
        true,
        Array.from(staffIds),
      );

      await this.chatService.removeFileChat(attachmentUrls);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async createShipmentAndShipperConsignee(user: CurrentUserDto, rfqNumber: string){
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
      .where(
        `
        q.rfqNumber = :rfqNumber
        AND q.rfqStatus IN (:...rfqStatus)
        AND q.status = :status
      `,
      )
      .setParameters({
        rfqNumber,
        affiliation: 'NLE',
        rfqStatus: [RfqStatus.DRAFT],
        companyId: user.companyId,
        status: 1,
      })
      .getOne();

    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    // submitted and override

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

      return await this.connection.transaction(async (entityManager) => {
        delete quotation.customer;
        await entityManager.update(Company, company.id, company);
        delete quotation.bids;
  
        await entityManager.save(quotation);
        await entityManager.save(sellingPrices);
  
        const result = await entityManager.save(shipment);
        return result;
      });
  }
}
