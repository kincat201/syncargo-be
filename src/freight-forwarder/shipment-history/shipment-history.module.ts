import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shipment } from 'src/entities/shipment.entity';
import { ShipmentHistory } from '../../entities/shipment-history.entity';
import { Quotation } from '../../entities/quotation.entity';
import { ShipmentHistoryService } from './shipment-history.service';

@Module({
  imports: [TypeOrmModule.forFeature([ShipmentHistory, Shipment, Quotation])],
  providers: [ShipmentHistoryService],
  exports: [ShipmentHistoryService],
})
export class ShipmentHistoryModule {}
