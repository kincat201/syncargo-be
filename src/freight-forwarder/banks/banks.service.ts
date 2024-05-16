import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bank } from 'src/entities/bank.entity';

@Injectable()
export class BanksService {
  constructor(@InjectRepository(Bank) private bankRepo: Repository<Bank>) {}

  async findAll(companyId: number) {
    try {
      return await this.bankRepo.find({ status: 1, companyId });
    } catch (error) {
      throw error;
    }
  }
}
