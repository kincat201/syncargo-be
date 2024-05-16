import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChatGateway } from './chat.gateway';
import { Chat, ChatSchema } from 'src/schemas/chat.schema';
import { ChatService } from './chat.service';
import { User } from '../../entities/user.entity';
import { Company } from '../../entities/company.entity';
import { WsAuthGuard } from '../auth/ws-auth.guard';
import { RedisModule } from '../../redis/redis.module';
import { S3Module } from '../../s3/s3.module';
import { ChatCustomer } from '../../entities/chat-customer.entity';
import { ChatRoom } from '../../entities/chat-room.entity';
import { Helper } from '../helpers/helper';
import { QuotationFilesModule } from '../quotation-files/quotation-files.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Company, ChatCustomer, ChatRoom]),
    MongooseModule.forFeature([{ name: Chat.name, schema: ChatSchema }]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('CACHE_TTL'),
        },
      }),
    }),
    QuotationFilesModule,
    RedisModule,
    ConfigModule,
    S3Module,
  ],
  providers: [ChatGateway, WsAuthGuard, ChatService, Helper],
  exports: [ChatService],
})
export class ChatModule {}
