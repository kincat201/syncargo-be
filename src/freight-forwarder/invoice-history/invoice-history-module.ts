import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shipment } from 'src/entities/shipment.entity';
import { Quotation } from '../../entities/quotation.entity';
import { InvoiceHistory } from '../../entities/invoice-history.entity';
import { Invoice } from '../../entities/invoice.entity';
import { InvoicePrice } from '../../entities/invoice-price.entity';
import { InvoiceHistoryService } from './invoice-history-service';
import { NotificationsModule } from '../notifications/notifications.module';
import { User } from 'src/entities/user.entity';
import { MailModule } from 'src/mail/mail.module';
import { JobSheetReceivableHistoryService } from '../jobsheet-receivable-history/jobsheet-receivable-history.service';
import { JobSheetReceivableHistory } from '../../entities/job-sheet-receivable-history.entity';
import { JobSheet } from '../../entities/job-sheet.entity';
import { JobSheetService } from '../jobsheets/jobsheets.service';
import { Customer } from '../../entities/customer.entity';
import { Helper } from '../helpers/helper';
import { JobSheetShipment } from '../../entities/job-sheet-shipment.entity';
import { ThirdParty } from '../../entities/third-party.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InvoiceHistory, Invoice, InvoicePrice, Shipment, Quotation, User, Customer,
      JobSheetReceivableHistory, JobSheet, JobSheetShipment, ThirdParty,
    ]),
    NotificationsModule,
    MailModule,
  ],
  providers: [
    InvoiceHistoryService,
    JobSheetService,
    JobSheetReceivableHistoryService,
    Helper,
  ],
  exports: [InvoiceHistoryService],
})
export class InvoiceHistoryModule {}
