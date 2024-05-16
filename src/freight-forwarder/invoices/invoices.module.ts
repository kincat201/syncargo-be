import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { InvoicesController } from './invoices.controller';

import { InvoicesService } from './invoices.service';
import { Helper } from 'src/freight-forwarder/helpers/helper';

import { Bank } from 'src/entities/bank.entity';
import { Quotation } from 'src/entities/quotation.entity';
import { ShipmentSelllingPrice } from 'src/entities/shipment-selling-price.entity';
import { Shipment } from 'src/entities/shipment.entity';
import { Invoice } from 'src/entities/invoice.entity';
import { PaymentHistory } from 'src/entities/payment-history.entity';
import { Company } from '../../entities/company.entity';
import { InvoiceRejectLog } from '../../entities/invoice-reject-log.entity';
import { InvoicePrice } from 'src/entities/invoice-price.entity';

import { PdfModule } from 'src/pdf/pdf.module';
import { RedisModule } from 'src/redis/redis.module';
import { S3Module } from 'src/s3/s3.module';
import { WhatsappModule } from 'src/whatsapp/whatsapp.module';
import { MailModule } from '../../mail/mail.module';
import { ShipmentHistoryModule } from '../shipment-history/shipment-history.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ShipmentSellingPricesModule } from '../shipment-selling-prices/shipment-selling-prices.module';
import { OriginDestinationModule } from '../origin-destination/origin-destination.module';
import { InvoiceHistoryModule } from '../invoice-history/invoice-history-module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invoice,
      Quotation,
      Shipment,
      ShipmentSelllingPrice,
      Bank,
      PaymentHistory,
      InvoiceRejectLog,
      Company,
      InvoicePrice,
    ]),
    RedisModule,
    S3Module,
    PdfModule,
    MailModule,
    WhatsappModule,
    ShipmentHistoryModule,
    NotificationsModule,
    ShipmentSellingPricesModule,
    OriginDestinationModule,
    InvoiceHistoryModule,
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService, Helper],
  exports: [InvoicesService],
})
export class InvoicesModule {}
