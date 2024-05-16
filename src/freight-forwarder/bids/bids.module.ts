import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quotation } from 'src/entities/quotation.entity';
import { RedisModule } from 'src/redis/redis.module';
import { User } from 'src/entities/user.entity';
import { BidsController } from './bids.controller';
import { BidsService } from './bids.service';
import { BidPrice } from 'src/entities/bid-price.entity';
import { Bid } from 'src/entities/bid.entity';
import { MailModule } from 'src/mail/mail.module';
import { QuotationsModule } from '../quotations/quotations.module';
import { PdfModule } from 'src/pdf/pdf.module';
import { OriginDestinationModule } from '../origin-destination/origin-destination.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Company } from 'src/entities/company.entity';
import { ChatCustomer } from '../../entities/chat-customer.entity';
import { ChatRoom } from '../../entities/chat-room.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { Chat, ChatSchema } from '../../schemas/chat.schema';

@Module({
  controllers: [BidsController],
  providers: [BidsService],
  imports: [
    TypeOrmModule.forFeature([
      Bid,
      BidPrice,
      Quotation,
      User,
      Company,
      ChatCustomer,
      ChatRoom,
    ]),
    MongooseModule.forFeature([{ name: Chat.name, schema: ChatSchema }]),
    RedisModule,
    MailModule,
    PdfModule,
    QuotationsModule,
    OriginDestinationModule,
    NotificationsModule,
  ],
  exports: [BidsService],
})
export class BidsModule {}
