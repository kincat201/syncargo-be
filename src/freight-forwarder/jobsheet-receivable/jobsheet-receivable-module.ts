import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Company } from 'src/entities/company.entity';
import { Quotation } from 'src/entities/quotation.entity';
import { MailModule } from 'src/mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';

import { Helper } from 'src/freight-forwarder/helpers/helper';
import { Invoice } from '../../entities/invoice.entity';
import { JobSheet } from '../../entities/job-sheet.entity';
import { RedisModule } from '../../redis/redis.module';
import { JobSheetModule } from '../jobsheets/jobsheets.module';
import { S3Module } from '../../s3/s3.module';
import { JobsheetReceivableService } from './jobsheet-receivable.service';
import { ThirdParty } from '../../entities/third-party.entity';
import { Customer } from '../../entities/customer.entity';
import { JobSheetReceivableHistoryModule } from '../jobsheet-receivable-history/jobsheet-receivable-history.module';
import { InvoicePrice } from '../../entities/invoice-price.entity';
import { InvoicesService } from '../invoices/invoices.service';
import { InvoicesModule } from '../invoices/invoices.module';
import { JobSheetReceivablePayment } from '../../entities/job-sheet-receivable-payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Quotation,
      Customer,
      ThirdParty,
      Company,
      Invoice,
      InvoicePrice,
      JobSheet,
      JobSheetReceivablePayment,
    ]),
    RedisModule,
    MailModule,
    S3Module,
    NotificationsModule,
    forwardRef(() => JobSheetModule),
    JobSheetReceivableHistoryModule,
    InvoicesModule,
  ],
  controllers: [],
  providers: [JobsheetReceivableService, Helper],
  exports: [JobsheetReceivableService],
})
export class JobsheetReceivableModule {}
