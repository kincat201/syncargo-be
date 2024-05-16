import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '../../redis/redis.module';
import { MailModule } from '../../mail/mail.module';
import { S3Module } from 'src/s3/s3.module';

import { CompaniesService } from './companies.service';

import { Company } from 'src/entities/company.entity';
import { SubscriptionHistory } from 'src/entities/subscription-history.entity';
import { BlHistory } from '../../entities/bl-history.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Company, SubscriptionHistory, BlHistory]),
    RedisModule,
    S3Module,
    MailModule,
    UsersModule,
  ],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
