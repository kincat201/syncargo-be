import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bank } from 'src/entities/bank.entity';
import { Currency } from 'src/entities/currency.entity';
import { PaymentAdvice } from 'src/entities/payment-advice.entity';
import { PaymentAdvicesService } from './payment-advices.service';
@Module({
  imports: [TypeOrmModule.forFeature([Bank, Currency, PaymentAdvice])],
  providers: [PaymentAdvicesService],
  exports: [PaymentAdvicesService],
})
export class PaymentAdvicesModule {}
