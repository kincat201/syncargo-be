import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { QuotationRevenueHistoryService } from './quotation-revenue-history.service';
import { Quotation } from '../../entities/quotation.entity';
import { QuotationRevenueHistory } from '../../entities/quotation-revenue-history.entity';

;

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Quotation,
      User,
      QuotationRevenueHistory,
    ]),
  ],
  providers: [
    QuotationRevenueHistoryService,
  ],
  exports: [QuotationRevenueHistoryService],
})
export class QuotationRevenueHistoryModule {}
