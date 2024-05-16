import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShipmentType } from 'src/entities/shipment-type.entity';
import { ShipmentTypesService } from './shipment-types.service';

@Module({
  imports: [TypeOrmModule.forFeature([ShipmentType])],
  providers: [ShipmentTypesService],
  exports: [ShipmentTypesService],
})
export class ShipmentTypesModule {}
