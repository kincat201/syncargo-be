import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quotation } from 'src/entities/quotation.entity';
import { RedisModule } from 'src/redis/redis.module';
import { ShipmentOtif } from 'src/entities/shipment-otif.entity';
import { Shipment } from 'src/entities/shipment.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Helper } from 'src/freight-forwarder/helpers/helper';
import { Invoice } from 'src/entities/invoice.entity';
import { Company } from '../../entities/company.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { ClaimHistory } from 'src/entities/claim-history.entity';
import { User } from 'src/entities/user.entity';
import { JobSheet } from '../../entities/job-sheet.entity';
import { JobSheetPayable } from '../../entities/job-sheet-payable.entity';
import { CompanyCurrency } from '../../entities/company-currency.entity';
import { SalesRevenueTargetModule } from '../sales-revenue-target/sales-revenue-target.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Quotation,
      ShipmentOtif,
      Shipment,
      Invoice,
      Company,
      ClaimHistory,
      User,
      JobSheet,
      JobSheetPayable,
      CompanyCurrency,
    ]),
    RedisModule,
    NotificationsModule,
    SalesRevenueTargetModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService, Helper],
})
export class DashboardModule {}
