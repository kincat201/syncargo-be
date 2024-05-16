import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentHistory } from 'src/entities/payment-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentHistory])],
  providers: [],
  exports: [],
})
export class PaymentHistoriesModule {}
