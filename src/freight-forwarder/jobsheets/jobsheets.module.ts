import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Company } from 'src/entities/company.entity';
import { Quotation } from 'src/entities/quotation.entity';
import { MailModule } from 'src/mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';

import { JobSheetController } from './jobsheets.controller';

import { JobSheetService } from './jobsheets.service';
import { Helper } from 'src/freight-forwarder/helpers/helper';
import { Invoice } from '../../entities/invoice.entity';
import { JobSheet } from '../../entities/job-sheet.entity';
import { RedisModule } from '../../redis/redis.module';
import { JobSheetPayableModule } from '../jobsheet-payables/jobsheet-payable-module';
import { Customer } from '../../entities/customer.entity';
import { JobsheetReceivableModule } from '../jobsheet-receivable/jobsheet-receivable-module';
import { JobSheetShipment } from '../../entities/job-sheet-shipment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Quotation,
      Company,
      Invoice,
      JobSheet,
      JobSheetShipment,
      Customer,
    ]),
    RedisModule,
    MailModule,
    NotificationsModule,
    forwardRef(() => JobSheetPayableModule),
    forwardRef(() => JobsheetReceivableModule),
  ],
  controllers: [JobSheetController],
  providers: [JobSheetService, Helper],
  exports: [JobSheetService],
})
export class JobSheetModule {}
