import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PriceComponent } from 'src/entities/price-component.entity';
import { PriceComponentsService } from './price-components.service';

@Module({
  providers: [PriceComponentsService],
  exports: [PriceComponentsService],
  imports: [TypeOrmModule.forFeature([PriceComponent])],
})
export class PriceComponentsModule {}
