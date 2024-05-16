import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditCheckFile } from '../../entities/credit-check-file.entity';
import { CreditCheckHistory } from '../../entities/credit-check-history.entity';
import { CreditCheck } from '../../entities/credit-check.entity';
import { CreditCheckService } from './credit-check.service';
import { CreditCheckController } from './credit-check.controller';
import { CompaniesModule } from '../companies/companies.module';
import { UsersModule } from '../users/users.module';
import { S3Module } from '../../s3/s3.module';
import { RedisModule } from 'src/redis/redis.module';
import { MailModule } from 'src/mail/mail.module';

@Module({
  controllers: [CreditCheckController],
  providers: [CreditCheckService],
  exports: [CreditCheckService],
  imports: [
    TypeOrmModule.forFeature([
      CreditCheck,
      CreditCheckFile,
      CreditCheckHistory,
    ]),
    CompaniesModule,
    UsersModule,
    S3Module,
    RedisModule,
    MailModule,
  ],
})
export class CreditCheckModule {}
