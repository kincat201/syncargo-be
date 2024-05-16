import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Shipment } from 'src/entities/shipment.entity';
import { ShipmentOtif } from 'src/entities/shipment-otif.entity';
import { Invoice } from 'src/entities/invoice.entity';
import { Port } from 'src/entities/port.entity';

import { CronModule } from 'src/freight-forwarder/cron/cron.module';
import { RedisModule } from 'src/redis/redis.module';
import { MailModule } from 'src/mail/mail.module';
import { OriginDestinationModule } from '../origin-destination/origin-destination.module';
import { PortsModule } from '../ports/ports.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { CompaniesModule } from '../companies/companies.module';

import { Helper } from 'src/freight-forwarder/helpers/helper';
import { ShipmentOtifsService } from './shipment-otifs.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShipmentOtif, Shipment, Invoice, Port]),
    RedisModule,
    CronModule,
    MailModule,
    OriginDestinationModule,
    PortsModule,
    NotificationsModule,
    UsersModule,
    CompaniesModule,
  ],
  providers: [ShipmentOtifsService, Helper],
  exports: [ShipmentOtifsService],
})
export class ShipmentOtifsModule {}
