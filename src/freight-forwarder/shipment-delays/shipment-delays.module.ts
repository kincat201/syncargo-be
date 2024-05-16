import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { S3Module } from 'src/s3/s3.module';
import { ShipmentDelay } from 'src/entities/shipment-delay.entity';
import { ShipmentDelaysService } from './shipment-delays.service';
import { ShipmentDelayFile } from 'src/entities/shipment-delay-file.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { Company } from 'src/entities/company.entity';
import { Quotation } from 'src/entities/quotation.entity';
import { OriginDestinationModule } from '../origin-destination/origin-destination.module';
import { CompaniesModule } from '../companies/companies.module';
import { ShipmentsService } from '../shipments/shipments.service';
import { Helper } from '../helpers/helper';
import { MailModule } from '../../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ShipmentDelay,
      ShipmentDelayFile,
      Quotation,
      Company,
    ]),
    S3Module,
    NotificationsModule,
    OriginDestinationModule,
    MailModule,
  ],
  providers: [ShipmentDelaysService, Helper],
  exports: [ShipmentDelaysService],
})
export class ShipmentDelaysModule {}
