import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShipmentSelllingPrice } from 'src/entities/shipment-selling-price.entity';
import { ShipmentSellingPricesService } from './shipment-selling-prices.service';
import { ShipmentHistoryModule } from '../shipment-history/shipment-history.module';
import { Helper } from '../helpers/helper';
import { Shipment } from 'src/entities/shipment.entity';
import { InvoicePrice } from 'src/entities/invoice-price.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShipmentSelllingPrice, Shipment, InvoicePrice]),
    ShipmentHistoryModule,
  ],
  providers: [ShipmentSellingPricesService, Helper],
  exports: [ShipmentSellingPricesService],
})
export class ShipmentSellingPricesModule {}
