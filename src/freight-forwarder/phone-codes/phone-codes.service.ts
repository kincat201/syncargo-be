import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PhoneCode } from 'src/entities/phone-code.entity';

@Injectable()
export class PhoneCodesService {
  constructor(
    @InjectRepository(PhoneCode) private phoneCodeRepo: Repository<PhoneCode>,
  ) {}

  async getAll() {
    return await this.phoneCodeRepo
      .createQueryBuilder('phoneCode')
      .where('phoneCode.code is not null')
      .orderBy('phoneCode.countryName', 'ASC')
      .getMany();
  }
}
