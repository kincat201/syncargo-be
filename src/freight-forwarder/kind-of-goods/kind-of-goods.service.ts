import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProductType } from 'src/enums/enum';
import { Repository } from 'typeorm';
import { KindOfGoods } from 'src/entities/kind-of-goods.entity';

@Injectable()
export class KindOfGoodsService {
  constructor(
    @InjectRepository(KindOfGoods)
    private kindOfGoodsRepo: Repository<KindOfGoods>,
  ) {}

  async getAll(productType: ProductType) {
    return await this.kindOfGoodsRepo.find({ productType });
  }
}
