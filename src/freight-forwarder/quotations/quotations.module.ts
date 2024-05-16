import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Company } from 'src/entities/company.entity';
import { Quotation } from 'src/entities/quotation.entity';
import { BidPrice } from 'src/entities/bid-price.entity';
import { ShipmentSelllingPrice } from 'src/entities/shipment-selling-price.entity';
import { Shipment } from 'src/entities/shipment.entity';
import { QuotationExtendLog } from 'src/entities/quotation-extend-log.entity';
import { ChatRoom } from '../../entities/chat-room.entity';
import { ChatCustomer } from '../../entities/chat-customer.entity';
import { Port } from 'src/entities/port.entity';

import { OriginDestinationModule } from 'src/freight-forwarder/origin-destination/origin-destination.module';
import { QuotationFilesModule } from 'src/freight-forwarder/quotation-files/quotation-files.module';
import { RedisModule } from 'src/redis/redis.module';
import { S3Module } from 'src/s3/s3.module';
import { MailModule } from 'src/mail/mail.module';
import { WhatsappModule } from 'src/whatsapp/whatsapp.module';
import { PdfModule } from 'src/pdf/pdf.module';
import { QiscusModule } from '../../qiscus/qiscus.module';
import { PortsModule } from '../ports/ports.module';
import { ShipmentHistoryModule } from '../shipment-history/shipment-history.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CompaniesModule } from '../companies/companies.module';

import { QuotationsController } from './quotations.controller';

import { QuotationsService } from './quotations.service';
import { Helper } from 'src/freight-forwarder/helpers/helper';
import { QuotationNleCompany } from '../../entities/quotation-nle-company.entity';
import { Bid } from 'src/entities/bid.entity';
import { QontakModule } from '../../qontak/qontak.module';
import { UsersModule } from '../users/users.module';
import { NotificationScheduling } from '../notification-scheduling/notification-scheduling.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Chat, ChatSchema } from '../../schemas/chat.schema';
import { JobSheet } from '../../entities/job-sheet.entity';
import { ChatModule } from '../chat/chat.module';
import { QuotationRevenueHistoryModule } from '../quotation-revenue-history/quotation-revenue-history.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Quotation,
      Company,
      BidPrice,
      ShipmentSelllingPrice,
      Shipment,
      QuotationExtendLog,
      ChatCustomer,
      ChatRoom,
      Port,
      QuotationNleCompany,
      Bid,
      JobSheet,
    ]),
    MongooseModule.forFeature([{ name: Chat.name, schema: ChatSchema }]),
    RedisModule,
    S3Module,
    MailModule,
    QuotationFilesModule,
    WhatsappModule,
    OriginDestinationModule,
    PdfModule,
    ShipmentHistoryModule,
    QiscusModule,
    QontakModule,
    PortsModule,
    NotificationsModule,
    CompaniesModule,
    UsersModule,
    NotificationScheduling,
    ChatModule,
    QuotationRevenueHistoryModule,
  ],
  controllers: [QuotationsController],
  providers: [QuotationsService, Helper],
  exports: [QuotationsService],
})
export class QuotationsModule {}
