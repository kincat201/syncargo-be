import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, In, Repository } from 'typeorm';
import { format } from 'date-fns';

import {
  NotificationActionStatus,
  NotificationType,
  OtifStatus,
  RoleFF,
  ShipmentService,
  ShipmentStatus,
} from 'src/enums/enum';
import { SubmitShipmentOtifDto } from './dtos/submit-shipment-otif.dto';
import { CurrentUserDto } from '../auth/dtos/current-user.dto';

import { Invoice } from 'src/entities/invoice.entity';
import { Shipment } from 'src/entities/shipment.entity';
import { ShipmentOtif } from 'src/entities/shipment-otif.entity';
import { Port } from 'src/entities/port.entity';

import { MailService } from 'src/mail/mail.service';
import { CronService } from 'src/freight-forwarder/cron/cron.service';
import { Helper } from 'src/freight-forwarder/helpers/helper';
import { OriginDestinationService } from '../origin-destination/origin-destination.service';
import { PortsService } from '../ports/ports.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { CompaniesService } from '../companies/companies.service';

@Injectable()
export class ShipmentOtifsService {
  constructor(
    @InjectRepository(ShipmentOtif)
    private shipmentOtifRepo: Repository<ShipmentOtif>,
    @InjectRepository(Shipment) private shipmentRepo: Repository<Shipment>,
    @InjectRepository(Invoice) private invoiceRepo: Repository<Invoice>,
    @InjectRepository(Port) private portRepo: Repository<Port>,
    private readonly helper: Helper,
    private connection: Connection,
    @Inject(forwardRef(() => CronService)) private cronService: CronService, // to resolve circular dependency
    private readonly mailService: MailService,
    private originDestinationService: OriginDestinationService,
    private portsService: PortsService,
    private notificationsService: NotificationsService,
    private usersService: UsersService,
    private companiesServoce: CompaniesService,
  ) {}

  async create(
    user: CurrentUserDto,
    rfqNumber: string,
    body: SubmitShipmentOtifDto,
  ) {
    const shipment = await this.shipmentRepo
      .createQueryBuilder('s')
      .innerJoin('s.quotation', 'q')
      .innerJoin('s.customer', 'c')
      .leftJoin('c.notificationSettingDisabled', 'nsd')
      .leftJoin('c.user', 'u', 'u.userStatus = :userStatus', { userStatus: 'USERVERIFICATION' })
      .innerJoin('c.company', 'ff')
      .select([
        's',
        'q.cityFrom',
        'q.cityTo',
        'q.shipmentVia',
        'q.countryFrom',
        'q.countryTo',
        'q.customerId',
        'c.companyName',
        'c.fullName',
        'c.email',
        'u.customerLogin',
        'ff.name',
        'nsd',
      ])
      .where(
        `
        s.rfqNumber = :rfqNumber
        AND s.status = :status
        AND q.companyId = :companyId
      `,
      )
      .setParameters({
        rfqNumber,
        companyId: user.companyId,
        status: 1,
      })
      .getOne();

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    let isPortExist: number;
    let port: Port;

    if ([OtifStatus.DEPARTURE, OtifStatus.ARRIVAL].includes(body.otifStatus)) {
      const originDestination =
        await this.originDestinationService.getCountryCode(
          user.companyId,
          body.location,
        );

      if (!originDestination) {
        throw new BadRequestException();
      }

      const portBody = {
        companyId: user.companyId,
        countryCode: originDestination.countryCode,
        portType: shipment.quotation.shipmentVia,
        portName:
          body.otifStatus === OtifStatus.DEPARTURE
            ? body.portOfLoading
            : body.portOfDischarge,
      };

      isPortExist = await this.portRepo.count(portBody);

      if (!isPortExist) {
        port = await this.portsService.create(
          user.companyId,
          user.userId,
          portBody,
          true,
        );
      }
    }

    const invoice = await this.invoiceRepo.findOne({ rfqNumber, status: 1 });

    const previousOtifStatus = shipment.otifStatus;
    const [otifStatus, shipmentStatus] = this.helper.checkOtif(
      shipment.shipmentService,
      shipment.otifStatus,
      body.otifStatus,
      invoice?.invoiceStatus,
    );

    shipment.shipmentStatus = shipmentStatus;
    shipment.otifStatus = otifStatus;

    const payload = this.helper.mapOtifBody(otifStatus, body);

    const shipmentOtif = await this.shipmentOtifRepo.create({
      ...payload,
      rfqNumber,
      otifStatus,
      createdByUserId: user.userId,
    });

    if (body.otifStatus === OtifStatus.DEPARTURE) {
      shipment.shippingLine = body.shippingLine;
      shipment.masterBl = body.masterAwb;
      shipment.houseBl = body.houseAwb;
      shipment.containerNumber = body.containerNumber;
    }

    const isFailed =
      otifStatus === OtifStatus.REJECTED || otifStatus === OtifStatus.CANCELLED;

    const icons = isFailed
      ? this.helper.mapOtifIcons(
          shipment.quotation.shipmentVia,
          shipment.shipmentService,
          otifStatus,
          previousOtifStatus,
        )
      : this.helper.mapOtifIcons(
          shipment.quotation.shipmentVia,
          shipment.shipmentService,
          otifStatus,
        );

    const origin = await this.originDestinationService.getCityCode(
      user.companyId,
      shipment.quotation.cityFrom,
    );
    const destination = await this.originDestinationService.getCityCode(
      user.companyId,
      shipment.quotation.cityTo,
    );
    const company = await this.companiesServoce.getOne({ id: user.companyId }, [
      'name',
      'logo',
      'phoneCode',
      'phoneNumber',
      'address',
      'email',
    ]);

    const mailBody = {
      isFailed,
      ff: company,
      companyName: shipment.customer.companyName,
      customerName: shipment.customer.fullName,
      email: shipment.customer.email,
      origin: origin.cityCode,
      destination: destination.cityCode,
      shipmentService: shipment.shipmentService,
      isFromDoor:
        shipment.shipmentService === ShipmentService.DTD ||
        shipment.shipmentService === ShipmentService.DTP,
      isToDoor:
        shipment.shipmentService === ShipmentService.DTD ||
        shipment.shipmentService === ShipmentService.PTD,
      otifStatus: otifStatus
        .toLowerCase()
        .split('_')
        .map((x) => x[0].toUpperCase() + x.substring(1))
        .join(' '),
      otifStatusValue: otifStatus,
      icons,
      details: {
        rfqNumber: shipment.rfqNumber,
        ...payload
      },
      ffName: company.name,
      ffLogo: company.logo,
      ffEmail: company.email,
      ffAddress: company.address,
      ffPhoneCode: company.phoneCode,
      ffPhoneNumber: company.phoneNumber,
    }

    mailBody[shipment.quotation.shipmentVia] = true;

    const result = await this.connection.transaction(async (entityManager) => {
      if (port) {
        await entityManager.save(port);
      }

      await entityManager.save(shipment);

      if (isFailed) {
        if (invoice) {
          invoice.status = 0;
          invoice.deletedByUserId = user.userId;
          invoice.deletedAt = new Date();
          await entityManager.save(invoice);
        }
      }

      const result = await entityManager.save(shipmentOtif)
      if(!shipment.customer.notificationSettingDisabled.find(item => item.name == 'SHIPMENT_'+body.otifStatus)) this.mailService.submitOtif(mailBody)

      if (user.customerModule && shipment.customer.user?.customerLogin) {
        this.notificationsService.create({
          ffName: shipment.customer.company.name,
          customerId: shipment.quotation.customerId,
          type: NotificationType.SHIPMENT,
          shipmentVia: shipment.quotation.shipmentVia,
          rfqNumber: shipment.rfqNumber,
          countryFrom: shipment.quotation.countryFrom,
          countryTo: shipment.quotation.countryTo,
          actionStatus: NotificationActionStatus[`OTIF_${body.otifStatus}`],
          isRead: false,
          createdAt: new Date(),
          createdBy: user.userId,
        });
      }

      if (otifStatus === OtifStatus.DEPARTURE) {
        Object.assign(result, { containerNumber: body.containerNumber });
      }

      return result;
    });

    if (process.env.NODE_ENV !== 'development') {
      let isBackDate = false;
      const today = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
      if (body.etd + ' ' + (body.etdTime ? body.etdTime.split(' ')[0] : '') < today || body.eta + ' ' + (body.etaTime ? body.etaTime.split(' ')[0] : '') < today) {
        isBackDate = true;
      }

      if (otifStatus === OtifStatus.SCHEDULED && !isBackDate) {
        const cronPayload = {
          rfqNumber: shipment.rfqNumber,
          etdDate: `${body.etd} ${body.etdTime.split(' ')[0]}`,
          etdTimeZone: body.etdTime.split(' ')[1],
          etaDate: `${body.eta} ${body.etaTime.split(' ')[0]}`,
          etaTimeZone: body.etaTime.split(' ')[1],
        };
        this.cronService.addSchedule(cronPayload);
      }
    }

    return result;
  }

  async update(
    user: CurrentUserDto,
    rfqNumber: string,
    body: SubmitShipmentOtifDto,
  ) {
    const { userId, fullName, companyId } = user;

    const shipment = await this.shipmentRepo
      .createQueryBuilder('s')
      .innerJoin('s.quotation', 'q')
      .innerJoin('s.customer', 'c')
      .select(['s', 'c.companyName','c.fullName', 'c.email', 'q.shipmentVia'])
      .where(`
        s.rfqNumber = :rfqNumber
        AND s.shipmentStatus NOT IN (:...shipmentStatus)
        AND s.status = :status
        AND q.companyId = :companyId
      `,
      )
      .setParameters({
        rfqNumber,
        shipmentStatus: [ShipmentStatus.FAILED, ShipmentStatus.COMPLETE],
        companyId,
        status: 1,
      })
      .getOne();

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    const shipmentOtif = await this.shipmentOtifRepo.findOne({
      rfqNumber,
      otifStatus: body.otifStatus,
      status: 1,
    });
    if (!shipmentOtif) {
      throw new NotFoundException('Shipment Otif not found');
    }

    let isPortExist: number;
    let port: Port;

    if ([OtifStatus.DEPARTURE, OtifStatus.ARRIVAL].includes(body.otifStatus)) {
      const originDestination =
        await this.originDestinationService.getCountryCode(
          user.companyId,
          body.location,
        );

      if (!originDestination) {
        throw new BadRequestException();
      }

      const portBody = {
        companyId: user.companyId,
        countryCode: originDestination.countryCode,
        portType: shipment.quotation.shipmentVia,
        portName:
          body.otifStatus === OtifStatus.DEPARTURE
            ? body.portOfLoading
            : body.portOfDischarge,
        status: 1,
      };

      isPortExist = await this.portRepo.count(portBody)

      if (!isPortExist) {
        port = await this.portsService.create(
          user.companyId,
          user.userId,
          portBody,
          true,
        );
      }
    }

    let previousSchedule;
    if (body.otifStatus === OtifStatus.SCHEDULED) {
      previousSchedule = {
        etd: `${shipmentOtif.etd} ${shipmentOtif.etdTime}`,
        eta: `${shipmentOtif.eta} ${shipmentOtif.etaTime}`,
      };
    }

    const updatedShipmentOtif = this.helper.mapOtifBody(body.otifStatus, body);
    Object.assign(shipmentOtif, updatedShipmentOtif, {
      updatedByUserId: userId,
    });

    const company = await this.companiesServoce.getOne({ id: user.companyId }, [
      'name',
      'logo',
      'phoneCode',
      'phoneNumber',
      'address',
      'email',
    ]);

    const mailBody = {
      ff: company,
      companyName: shipment.customer.companyName,
      customerName: shipment.customer.fullName,
      email: shipment.customer.email,
      otifStatus: body.otifStatus
        .toLowerCase()
        .split('_')
        .map((x) => x[0].toUpperCase() + x.substring(1))
        .join(' '),
      ffName: company.name,
      ffLogo: company.logo,
      ffEmail: company.email,
      ffAddress: company.address,
      ffPhoneCode: company.phoneCode,
      ffPhoneNumber: company.phoneNumber,
    }

    const result = await this.connection.transaction(async (entityManager) => {
      if (port) {
        await entityManager.save(port);
      }

      if (body.otifStatus === OtifStatus.DEPARTURE) {
        shipment.shippingLine = body.shippingLine;
        shipment.masterBl = body.masterAwb;
        shipment.houseBl = body.houseAwb;
        shipment.containerNumber = body.containerNumber;

        delete shipment.customer;
        delete shipment.quotation;
        await entityManager.save(shipment);
      }

      const result = await entityManager.save(shipmentOtif);
      this.mailService.editOtif(mailBody);

      if (body.otifStatus === OtifStatus.DEPARTURE) {
        Object.assign(result, { containerNumber: body.containerNumber });
      }

      return result;
    });

    if (process.env.NODE_ENV !== 'development') {
      let isBackDate = false;
      const today = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
      if (shipmentOtif.etd + ' ' + (shipmentOtif.etdTime ? shipmentOtif.etdTime.split(' ')[0] : '') < today || shipmentOtif.eta + ' ' + (shipmentOtif.etaTime ? shipmentOtif.etaTime.split(' ')[0] : '') < today) {
        isBackDate = true;
      }

      if (body.otifStatus === OtifStatus.SCHEDULED && !isBackDate) {
        const updatedSchedule = {
          etd: `${shipmentOtif.etd} ${shipmentOtif.etdTime}`,
          eta: `${shipmentOtif.eta} ${shipmentOtif.etaTime}`,
        };

        const isEtdChanged =
          updatedSchedule.etd === previousSchedule.etd ? false : true;
        const isEtaChanged =
          updatedSchedule.eta === previousSchedule.eta ? false : true;

        const cronPayload = {
          rfqNumber: shipment.rfqNumber,
          etdDate: `${shipmentOtif.etd} ${shipmentOtif.etdTime.split(' ')[0]}`,
          etdTimeZone: shipmentOtif.etdTime.split(' ')[1],
          etaDate: `${shipmentOtif.eta} ${shipmentOtif.etaTime.split(' ')[0]}`,
          etaTimeZone: shipmentOtif.etaTime.split(' ')[1],
        };

        if (
          userId !== shipmentOtif.createdByUserId &&
          (isEtdChanged || isEtaChanged)
        ) {
          cronPayload['sendNotifToCreator'] = true;
          (cronPayload['userIdCreator'] = shipmentOtif.createdByUserId),
            (cronPayload['changerFullname'] = fullName),
            (cronPayload['previousEtd'] = isEtdChanged
              ? previousSchedule.etd
              : null);
          cronPayload['previousEta'] = isEtaChanged
            ? previousSchedule.eta
            : null;
        }

        this.cronService.editSchedule(cronPayload);
      }
    }
    return result;
  }

  async checkIdleShipment() {
    const shipments = await this.shipmentRepo
      .createQueryBuilder('s')
      .leftJoin('s.shipmentOtifs', 'so')
      .innerJoin('s.quotation', 'q')
      .innerJoin('s.customer', 'c')
      .innerJoin('c.user', 'cu')
      .select([
        'q.shipmentService AS shipmentService',
        'q.countryFromCode AS countryFromCode',
        'q.countryFrom AS countryFrom',
        'q.countryToCode AS countryToCode',
        'q.countryTo AS countryTo',
        's.rfqNumber AS rfqNumber',
        's.otifStatus AS otifStatus',
        's.customerId AS customerId',
        'c.companyId AS companyId',
        'cu.photo AS customerLogo',
      ])
      .where(
        `
        s.shipmentStatus NOT IN (:...shipmentStatus)
        AND IF (
          s.otifStatus = :otifStatus,
          DATE_ADD(DATE_FORMAT(s.createdAt, '%Y-%m-%d'), INTERVAL 3 DAY) = CURDATE(),
          DATE_ADD(DATE_FORMAT(so.createdAt, '%Y-%m-%d'), INTERVAL 3 DAY) = CURDATE()
        )
      `,
      )
      .setParameters({
        shipmentStatus: [ShipmentStatus.COMPLETE, ShipmentStatus.FAILED],
        otifStatus: OtifStatus.BOOKED,
      })
      .groupBy('rfqNumber')
      .getRawMany();

    for (let shipment of shipments) {
      const {
        shipmentService,
        countryFromCode,
        countryFrom,
        countryToCode,
        countryTo,
        rfqNumber,
        otifStatus,
        customerId,
        companyId,
        customerLogo,
      } = shipment;

      const users = await this.usersService.getUsers(
        {
          companyId,
          role: In(Object.values(RoleFF)),
          userStatus: 'USERVERIFICATION',
          status: 1,
        },
        ['userId'],
      );

      users.forEach((el) => (el['isRead'] = false));

      const nextOtifStatus = this.helper.getNextOtif(
        shipmentService,
        otifStatus,
      );

      this.notificationsService.create({
        sender: 'System',
        receipient: {
          platform: 'FF',
          companyId,
          users,
        },
        customerId,
        customerLogo,
        type: NotificationType.SHIPMENT,
        actionStatus: NotificationActionStatus[`OTIF_${nextOtifStatus}`],
        rfqNumber,
        countryFromCode,
        countryFrom,
        countryToCode,
        countryTo,
        createdAt: new Date(),
        createdBy: 0,
      });
    }
  }

  async updateDummyScheduledOtifDateToToday() {
    const otifs = await this.shipmentOtifRepo
      .createQueryBuilder('so')
      .innerJoin('t_quotations', 'q', 'so.rfq_number = q.rfq_number')
      .select(['so.rfq_number', 'so.otif_status', 'COUNT(so.id) AS so_count'])
      .where('q.affiliation = \'DUMMY\'')
      .groupBy('so.rfq_number')
      .having('so_count = 1')
      .getRawMany();

    const targetedRfq = [];
    const currentDate = new Date().toJSON().slice(0, 10);

    otifs.map((otif) => {
      if (otif.otif_status === 'SCHEDULED') {
        targetedRfq.push(otif.rfq_number);
      }
    });

    await this.shipmentOtifRepo
      .createQueryBuilder()
      .update(ShipmentOtif)
      .set({eta: currentDate, etd: currentDate})
      .where('rfqNumber IN(:rfqNumbers)', {rfqNumbers: targetedRfq})
      .execute();

  }
}
