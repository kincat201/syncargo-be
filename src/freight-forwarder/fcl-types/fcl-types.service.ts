import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FclType } from 'src/entities/fcl-type.entity';

@Injectable()
export class FclTypesService {
  constructor(
    @InjectRepository(FclType) private fclTypeRepo: Repository<FclType>,
  ) {}

  async getAll() {
    return await this.fclTypeRepo.find();
  }
}
