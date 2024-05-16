import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from 'src/redis/redis.module';
import { User } from 'src/entities/user.entity';
import { PaymentAdvice } from 'src/entities/payment-advice.entity';
import { Company } from 'src/entities/company.entity';
import { SettingsController } from './settings.controller';
import { UsersModule } from 'src/freight-forwarder/users/users.module';
import { CompaniesModule } from 'src/freight-forwarder/companies/companies.module';
import { ConfigModule } from '@nestjs/config';
import { Currency } from 'src/entities/currency.entity';
import { Bank } from 'src/entities/bank.entity';
import { PaymentAdvicesModule } from 'src/freight-forwarder/payment-advices/payment-advices.module';
import { PdfModule } from '../../pdf/pdf.module';
import { UserHistoriesModule } from '../user-histories/user-histories.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([User, Company, PaymentAdvice, Currency, Bank]),
    RedisModule,
    UsersModule,
    CompaniesModule,
    ConfigModule,
    PaymentAdvicesModule,
    PdfModule,
    UserHistoriesModule,
  ],
  controllers: [SettingsController],
  providers: [],
  exports: [],
})
export class SettingsModule {}
