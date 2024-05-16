import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Currency } from 'src/entities/currency.entity';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { CreateCurrencyDto } from './dtos/create-currency.dto';

@Injectable()
export class CurrenciesService {
  constructor(
      @InjectRepository(Currency) private currencyRepo: Repository<Currency>
  ){}

  async findAll(companyId: number){
      try {
          return await this.currencyRepo.find({ status: 1 })
      } catch (error) {
          throw error                       
      }
  }
}
