import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VendorPricesService } from './vendor-prices.service';
import { VendorPrice } from '../../entities/vendor-price.entity';
import { VendorPriceComponent } from '../../entities/vendor-price-component.entity';

@Module({
  providers: [VendorPricesService],
  exports: [VendorPricesService],
  imports: [TypeOrmModule.forFeature([VendorPrice,VendorPriceComponent])],
})
export class VendorPricesModule {}
