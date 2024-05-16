import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Company } from 'src/entities/company.entity';
import { Quotation } from 'src/entities/quotation.entity';
import { MailModule } from 'src/mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';

import { JobSheetPayableService } from './jobsheet-payable-service';
import { Helper } from 'src/freight-forwarder/helpers/helper';
import { Invoice } from '../../entities/invoice.entity';
import { JobSheet } from '../../entities/job-sheet.entity';
import { RedisModule } from '../../redis/redis.module';
import { JobSheetPayable } from '../../entities/job-sheet-payable.entity';
import { JobSheetPayablePrice } from '../../entities/job-sheet-payable-prices.entity';
import { JobSheetModule } from '../jobsheets/jobsheets.module';
import { JobSheetPayableFilesModule } from '../jobsheet-payable-files/job-sheet-payable-files.module';
import { JobSheetPayableFile } from '../../entities/job-sheet-payable-files.entity';
import { JobSheetPayableHistoryModule } from '../jobsheet-payable-history/jobsheet-payable-history.module';
import { S3Module } from '../../s3/s3.module';
import { JobSheetPayablePayment } from '../../entities/job-sheet-payable-payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Quotation,
      Company,
      Invoice,
      JobSheet,
      JobSheetPayable,
      JobSheetPayablePrice,
      JobSheetPayableFile,
      JobSheetPayablePayment,
    ]),
    RedisModule,
    MailModule,
    S3Module,
    NotificationsModule,
    forwardRef(() => JobSheetModule),
    JobSheetPayableFilesModule,
    JobSheetPayableHistoryModule,
  ],
  controllers: [],
  providers: [JobSheetPayableService, Helper],
  exports: [JobSheetPayableService],
})
export class JobSheetPayableModule {}
