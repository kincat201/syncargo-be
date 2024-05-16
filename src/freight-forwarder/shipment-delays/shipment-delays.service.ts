import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { S3Service } from 'src/s3/s3.service';
import { Connection, Repository } from 'typeorm';
import { ShipmentDelay } from 'src/entities/shipment-delay.entity';
import { SubmitShipmentDelayDto } from './dtos/submit-shipment-delay.dto';
import { ShipmentDelayFile } from 'src/entities/shipment-delay-file.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationActionStatus, NotificationType, OtifStatus, ShipmentService } from 'src/enums/enum';
import { Quotation } from 'src/entities/quotation.entity';
import { OriginDestinationService } from '../origin-destination/origin-destination.service';
import { Helper } from '../helpers/helper';
import { MailService } from '../../mail/mail.service';

@Injectable()
export class ShipmentDelaysService {
  constructor(
    @InjectRepository(ShipmentDelay)
    private shipmentDelayRepo: Repository<ShipmentDelay>,
    @InjectRepository(ShipmentDelayFile)
    private shipmentDelayFileRepo: Repository<ShipmentDelayFile>,
    @InjectRepository(Quotation) private quotationRepo: Repository<Quotation>,
    private s3Service: S3Service,
    private connection: Connection,
    private notificationsService: NotificationsService,
    private originDestinationService: OriginDestinationService,
    private helper: Helper,
    private mailService: MailService,
  ) {}

  async submit(userId: number,companyId: number, rfqNumber: string, body: SubmitShipmentDelayDto, uploads: any) {
    const { otifStatus, delayDate, estimatedDelayUntil, note } = body

    return await this.connection.transaction(async (entityManager) => {
      await this.s3Service.uploadFiles(uploads);

      const files = [];
      const fileContainer = 'saas';
      for (let upload of uploads) {
        const fileName = upload.hashedFileName;
        files.push({
          rfqNumber,
          otifStatus,
          fileContainer,
          fileName,
          originalName: upload.file.originalname,
          createdByUserId: userId,
          url: `${process.env.URL_S3}/${fileContainer}/${fileName}`,
        });
      }
      const newFiles = this.shipmentDelayFileRepo.create(files);
      await entityManager.save(newFiles);

      const delay = await this.shipmentDelayRepo
        .createQueryBuilder('d')
        .where(
          `d.rfqNumber = :rfqNumber AND d.otifStatus = :otifStatus`, 
          { rfqNumber, otifStatus }
        )
        .getOne()

      const quotation = await this.quotationRepo
        .createQueryBuilder('q')
        .innerJoin('q.customer', 'c')
        .leftJoin('c.notificationSettingDisabled', 'nsd')
        .leftJoin('c.user', 'u', 'u.userStatus = :userStatus', { userStatus: 'USERVERIFICATION' })
        .leftJoin('q.shipment', 's')
        .innerJoin('c.company', 'ff')
        .where(
          `
          q.rfqNumber = :rfqNumber 
          AND q.companyId = :companyId 
          AND q.status = :status
        `,
        )
        .select([
          'q.rfqNumber',
          'q.customerId',
          'q.countryFrom',
          'q.countryTo',
          'q.cityFrom',
          'q.cityTo',
          'q.shipmentVia',
          'u.customerLogin',
          'ff.name',
          'ff.logo',
          'ff.email',
          'ff.address',
          'ff.phoneCode',
          'ff.phoneNumber',
          'c.fullName',
          'c.email',
          'nsd',
          's.shipmentService',
          's.otifStatus',
        ])
        .setParameters({
          rfqNumber,
          companyId: companyId,
          status: 1,
        })
        .getOne();

      const previousOtifStatus = quotation.shipment?.otifStatus

      const origin = await this.originDestinationService.getCityCode(companyId, quotation.cityFrom)
      const destination = await this.originDestinationService.getCityCode(companyId, quotation.cityTo)

      const icons = this.helper.mapOtifIcons(quotation.shipmentVia, quotation.shipment?.shipmentService, OtifStatus[otifStatus], previousOtifStatus)

      const mailBody = {
        isFailed : true,
        companyName: quotation.customer?.company?.name,
        customerName: quotation.customer?.fullName,
        email: quotation.customer?.email,
        origin: origin.cityCode,
        destination: destination.cityCode,
        shipmentService: quotation.shipment?.shipmentService,
        isFromDoor: quotation.shipment?.shipmentService === ShipmentService.DTD || quotation.shipment?.shipmentService === ShipmentService.DTP,
        isToDoor: quotation.shipment?.shipmentService === ShipmentService.DTD || quotation.shipment?.shipmentService === ShipmentService.PTD,
        otifStatus: otifStatus.toLowerCase()
          .split('_')
          .map(x => x[0].toUpperCase() + x.substring(1))
          .join(' '),
        icons,
        details: {
          rfqNumber,
          otifStatus,
          delayDate,
          estimatedDelayUntil,
          note,
        },
        ffName: quotation.customer?.company?.name,
        ffLogo: quotation.customer?.company?.logo,
        ffEmail: quotation.customer?.company?.email,
        ffAddress: quotation.customer?.company?.address,
        ffPhoneCode: quotation.customer?.company?.phoneCode,
        ffPhoneNumber: quotation.customer?.company?.phoneNumber,
        files: null,
      }

      mailBody[quotation.shipmentVia] = true
      
      if (delay) {
        mailBody.files = [];
        const delayFiles = await this.shipmentDelayFileRepo.find({ rfqNumber })

        const fileNames = [];
        for (let file of delayFiles) {
          if(body.deletedFiles.includes(file.fileName)){
            fileNames.push(file.fileName)
            await entityManager.remove(file);
          }else{
            mailBody.files.push({
              filename: file.originalName,
              path: file.url,
            })
          }
        }
        if(fileNames.length > 0) await this.s3Service.deleteFiles(fileNames)

        Object.assign(delay, { delayDate, estimatedDelayUntil, note, updatedByUserId: userId })

        if(!quotation.customer?.notificationSettingDisabled.find(item => item.name == 'SHIPMENT_DELAYED')) this.mailService.delayOtif(mailBody)

        return await entityManager.save(delay)
        
      } else {

        const newDelay = this.shipmentDelayRepo.create({
          rfqNumber,
          otifStatus,
          delayDate,
          estimatedDelayUntil,
          note,
          createdByUserId: userId,
        });

        return await this.connection.transaction(async (entityManager) => {
          const result = await entityManager.save(newDelay);

          if (quotation.customer?.user?.customerLogin) {
            this.notificationsService.create({
              ffName: quotation.company?.name,
              customerId: quotation.customerId,
              type: NotificationType.SHIPMENT,
              shipmentVia: quotation.shipmentVia,
              rfqNumber: rfqNumber,
              countryFrom: quotation.countryFrom,
              countryTo: quotation.countryTo,
              actionStatus: NotificationActionStatus.OTIF_DELAYED,
              isRead: false,
              createdAt: new Date(),
              createdBy: userId,
            })
          }

          mailBody.files = [];
          files.map(item=>{
            mailBody.files.push({
              filename: item.originalName,
              path: item.url,
            })
          })

          if(!quotation.customer?.notificationSettingDisabled.find(item => item.name == 'SHIPMENT_DELAYED')) this.mailService.delayOtif(mailBody)

          return result
        })
        
      }
    });
  }
}
