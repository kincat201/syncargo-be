import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Quotation } from 'src/entities/quotation.entity';
import { Shipment } from 'src/entities/shipment.entity';
import { ShipmentOtif } from 'src/entities/shipment-otif.entity';
import { Invoice } from 'src/entities/invoice.entity';
import { Company } from 'src/entities/company.entity';
import { ShipmentSelllingPrice } from 'src/entities/shipment-selling-price.entity';
import { BidPrice } from 'src/entities/bid-price.entity';

import { RedisModule } from 'src/redis/redis.module';
import { ShipmentFilesModule } from 'src/freight-forwarder/shipment-files/shipment-files.module';
import { ShipmentOtifsModule } from 'src/freight-forwarder/shipment-otifs/shipment-otifs.module';
import { ShipmentSellingPricesModule } from 'src/freight-forwarder/shipment-selling-prices/shipment-selling-prices.module';
import { ShipmentDelaysModule } from '../shipment-delays/shipment-delays.module';
import { ShipmentHistoryModule } from '../shipment-history/shipment-history.module';
import { S3Module } from 'src/s3/s3.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CompaniesModule } from '../companies/companies.module';

import { ShipmentsController } from './shipments.controller';

import { Helper } from 'src/freight-forwarder/helpers/helper';
import { ShipmentsService } from './shipments.service';
import { PdfModule } from 'src/pdf/pdf.module';
import { ConfigModule } from '@nestjs/config';
import { BlHistory } from '../../entities/bl-history.entity';
import { NotificationScheduling } from '../notification-scheduling/notification-scheduling.module';
import { UsersModule } from '../users/users.module';
import { HttpModule } from '@nestjs/axios';
import { MailModule } from '../../mail/mail.module';
import { QuotationFilesModule } from '../quotation-files/quotation-files.module';
import { ChatModule } from '../chat/chat.module';
import { CeisaModule } from '../ceisa/ceisa.module';
import { QuotationRevenueHistoryModule } from '../quotation-revenue-history/quotation-revenue-history.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Shipment,
      Quotation,
      ShipmentOtif,
      Invoice,
      Company,
      BlHistory,
      ShipmentSelllingPrice,
      BidPrice,
    ]),
    S3Module,
    RedisModule,
    ShipmentFilesModule,
    ShipmentOtifsModule,
    ShipmentSellingPricesModule,
    ShipmentHistoryModule,
    ShipmentDelaysModule,
    NotificationsModule,
    CompaniesModule,
    ConfigModule,
    PdfModule,
    NotificationScheduling,
    UsersModule,
    PdfModule,
    HttpModule,
    MailModule,
    QuotationFilesModule,
    ChatModule,
    CeisaModule,
    QuotationRevenueHistoryModule,
  ],
  controllers: [ShipmentsController],
  providers: [ShipmentsService, Helper],
  exports: [ShipmentsService],
})
export class ShipmentsModule {}
