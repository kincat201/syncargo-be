import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shipment } from 'src/entities/shipment.entity';
import { User } from 'src/entities/user.entity';
import { WhatsappModule } from 'src/whatsapp/whatsapp.module';
import { QuotationsModule } from '../quotations/quotations.module';
import { ShipmentOtifsModule } from '../shipment-otifs/shipment-otifs.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CronService } from './cron.service';
import { CompaniesModule } from '../companies/companies.module';
import { CreditCheckModule } from '../credit-checks/credit-check.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Shipment, User]),
    WhatsappModule,
    QuotationsModule,
    CompaniesModule,
    CreditCheckModule,
    forwardRef(() => ShipmentOtifsModule), // to resolve circular dependency
  ],
  providers: [CronService],
  exports: [CronService],
})
export class CronModule {}
