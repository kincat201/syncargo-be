import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KindOfGoods } from 'src/entities/kind-of-goods.entity';
import { KindOfGoodsService } from './kind-of-goods.service';

@Module({
  imports: [TypeOrmModule.forFeature([KindOfGoods])],
  providers: [KindOfGoodsService],
  exports: [KindOfGoodsService],
})
export class KindOfGoodsModule {}
