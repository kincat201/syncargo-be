import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesRevenueTargetService } from './sales-revenue-target.service';
import { User } from '../../entities/user.entity';
import { SalesRevenueTargetHistory } from '../../entities/sales-revenue-target-history.entity';
import { Helper } from '../helpers/helper';

;

@Module({
  imports: [
    TypeOrmModule.forFeature([User,SalesRevenueTargetHistory]),
  ],
  providers: [
    SalesRevenueTargetService,
    Helper,
  ],
  exports: [SalesRevenueTargetService],
})
export class SalesRevenueTargetModule {}
