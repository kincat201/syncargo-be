import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { User } from 'src/entities/user.entity';
import { UsersService } from './users.service';
import { ConfigModule } from '@nestjs/config';
import { Crypto } from 'src/utilities/crypto';
import { MailModule } from 'src/mail/mail.module';
import { RedisModule } from 'src/redis/redis.module';
import { S3Module } from 'src/s3/s3.module';
import { Company } from 'src/entities/company.entity';
import { Menu } from 'src/entities/menu.entity';
import { Helper } from '../helpers/helper';
import { AnnouncementsModule } from '../announcements/announcements.module';
import { MongooseModule } from '@nestjs/mongoose';
import { UserActivity, UserActivitySchema } from 'src/schemas/userActivityHistory.schema';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Company, Menu]),
    MongooseModule.forFeature([
      { name: UserActivity.name, schema: UserActivitySchema },
    ]),
    MailModule,
    RedisModule,
    ConfigModule,
    S3Module,
    AnnouncementsModule,
  ],
  providers: [UsersService, Crypto, Helper],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
