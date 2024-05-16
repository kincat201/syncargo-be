import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PackagingType } from 'src/entities/packaging-type.entity';

@Injectable()
export class PackagingTypesService {
  constructor(
    @InjectRepository(PackagingType)
    private packagingTypeRepo: Repository<PackagingType>,
  ) {}

  async getAll(shipmentTypeCode: string) {
    return await this.packagingTypeRepo.find({ shipmentTypeCode });
  }
}
