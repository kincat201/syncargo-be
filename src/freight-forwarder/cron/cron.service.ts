import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob, CronTime } from 'cron';
import { sub, format } from 'date-fns';
import { InjectRepository } from '@nestjs/typeorm';
import { Shipment } from 'src/entities/shipment.entity';
import { Repository } from 'typeorm';
import { WhatsappService } from 'src/whatsapp/whatsapp.service';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';
import { OtifStatus } from 'src/enums/enum';
import { User } from 'src/entities/user.entity';
import { QuotationsService } from '../quotations/quotations.service';
import { ShipmentOtifsService } from '../shipment-otifs/shipment-otifs.service';
import { CompaniesService } from '../companies/companies.service';
import { CreditCheckService } from '../credit-checks/credit-check.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name)

  constructor(
    private schedulerRegistry: SchedulerRegistry,
    @InjectRepository(Shipment) private shipmentRepo: Repository<Shipment>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private whatsappService: WhatsappService,
    private quotationsService: QuotationsService,
    private companiesService: CompaniesService,
    private creditCheckService: CreditCheckService,
    @Inject(forwardRef(() => ShipmentOtifsService)) private shipmentOtifsService: ShipmentOtifsService, // to resolve circular dependency
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  // @Cron(CronExpression.EVERY_10_SECONDS)
  handleCron() {
    // this.logger.debug('check idle expired quotation');
    this.quotationsService.checkIdleQuotation()
    this.shipmentOtifsService.checkIdleShipment()
    this.companiesService.getExpiredFreeTrialCompany();
    this.shipmentOtifsService.updateDummyScheduledOtifDateToToday();
    this.creditCheckService.expireCreditCheck();
  }

  async getUserPhone(userId: number) {
    return await this.userRepo.findOne({
      where: {
        userId,
        userStatus: 'USERVERIFICATION',
        status: 1,
      },
      select: ['fullName', 'phoneCode', 'phoneNumber'],
    });
  }

  // to get latest or most updated data
  async getShipmentData(rfqNumber: string) {
    const shipment = await this.shipmentRepo
      .createQueryBuilder('s')
      .innerJoin('s.customer', 'c')
      .innerJoin('s.shipmentOtifs', 'o', 'o.otifStatus = :otifStatus')
      .where('s.rfqNumber = :rfqNumber AND s.status = :status')
      .select([
        's.rfqNumber',
        'c.companyName',
        'o.createdByUserId',
      ])
      .setParameters({
        rfqNumber,
        otifStatus: OtifStatus.SCHEDULED,
        status: 1,
      })
      .getOne();

    const user = await this.getUserPhone(
      shipment?.shipmentOtifs[0]?.createdByUserId,
    );

    if (!user?.phoneCode || !user?.phoneNumber) {
      this.schedulerRegistry.deleteCronJob(`ETD - ${rfqNumber}`);
      this.schedulerRegistry.deleteCronJob(`ETA - ${rfqNumber}`);
    }

    return {
      companyName: shipment?.customer?.companyName,
      phone: `${user?.phoneCode}${user?.phoneNumber}`,
    };
  }

  getZonedDate(date: string, timeZone: string) {
    const newDate = format(
      sub(new Date(date), { hours: 2 }),
      'yyyy-MM-dd HH:mm:ss',
    );
    const utcDate = zonedTimeToUtc(newDate, timeZone);
    return utcToZonedTime(utcDate, 'Asia/Jakarta');
  }

  addSchedule(payload) {
    const { rfqNumber, etdDate, etdTimeZone, etaDate, etaTimeZone } = payload;

    const etdZonedDate = this.getZonedDate(etdDate, etdTimeZone);
    const etaZonedDate = this.getZonedDate(etaDate, etaTimeZone);

    this.addCronJob(`ETD - ${rfqNumber}`, etdZonedDate, rfqNumber, 'etd');
    this.addCronJob(`ETA - ${rfqNumber}`, etaZonedDate, rfqNumber, 'eta');
  }

  async editSchedule(payload) {
    const {
      rfqNumber,
      etdDate,
      etdTimeZone,
      etaDate,
      etaTimeZone,
      sendNotifToCreator,
      // if sendNotifToCreator false, below properties are nullish
      userIdCreator,
      changerFullname,
      previousEtd,
      previousEta,
    } = payload;

    const etdZonedDate = this.getZonedDate(etdDate, etdTimeZone);
    const etaZonedDate = this.getZonedDate(etaDate, etaTimeZone);

    this.setTime(`ETD - ${rfqNumber}`, etdZonedDate, rfqNumber, 'etd');
    this.setTime(`ETA - ${rfqNumber}`, etaZonedDate, rfqNumber, 'eta');

    if (sendNotifToCreator) {
      const userCreator = await this.getUserPhone(userIdCreator);
      const phone = `${userCreator?.phoneCode}${userCreator?.phoneNumber}`;
      let message = '';

      if (phone && !isNaN(Number(phone))) {
        // SEND WA Notif
        /*if (previousEtd) {
          message = `Attention!\nShipment with RFQ number: ${rfqNumber}\nETD has been changed by ${changerFullname} from ${previousEtd} to ${etdDate} ${etdTimeZone}`

          // console.log(`kirim notif ke ${phone}\n${message}`)
          await this.whatsappService.send(phone, message)
        }*/

        // SEND WA Notif
        /*if (previousEta) {
          message = `Attention!\nShipment with RFQ number: ${rfqNumber}\nETA has been changed by ${changerFullname} from ${previousEta} to ${etaDate} ${etaTimeZone}`

          // console.log(`kirim notif ke ${phone}\n${message}`)
          await this.whatsappService.send(phone, message)
        }*/
      }
    }
  }

  addCronJob(
    cronName: string,
    cronTime: Date,
    rfqNumber: string,
    type: string,
  ) {
    const job = new CronJob({
      cronTime,
      onTick: async () => {
        const data = await this.getShipmentData(rfqNumber);
        let message = '';
        if (type === 'etd') {
          message = `ETD:\nReminder!\nYour shipment will depart in two hours with RFQ number ${rfqNumber} belongs to ${data.companyName}\nPlease update departure status immediately`;
        } else if (type === 'eta') {
          message = `ETA:\nReminder!\nYour shipment will arrive in two hours with RFQ number ${rfqNumber} belongs to ${data.companyName}\nPlease update arrival status immediately`;
        }

        // SEND WA Notif
        /*if (data.phone && !isNaN(Number(data.phone))) {
          // console.log(`kirim reminder ke ${data.phone}\n${message}`)
          await this.whatsappService.send(data.phone, message)
        }*/
      },
    });

    this.schedulerRegistry.addCronJob(cronName, job);
    job.start();
  }

  setTime(cronName: string, cronTime: Date, rfqNumber: string, type: string) {
    try {
      const job = this.schedulerRegistry.getCronJob(cronName);
      job.setTime(new CronTime(cronTime));
    } catch (error) {
      this.addCronJob(cronName, cronTime, rfqNumber, type);
    }
  }
}
