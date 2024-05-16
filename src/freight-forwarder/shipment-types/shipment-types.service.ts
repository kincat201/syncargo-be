import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShipmentType } from 'src/entities/shipment-type.entity';

@Injectable()
export class ShipmentTypesService {
  constructor(
    @InjectRepository(ShipmentType)
    private shipmentTypeRepo: Repository<ShipmentType>,
  ) {}

  async getAll() {
    return await this.shipmentTypeRepo.find();
  }
}
