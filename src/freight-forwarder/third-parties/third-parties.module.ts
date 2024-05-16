import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThirdParty } from '../../entities/third-party.entity';
import { ThirdPartyService } from './third-parties.service';
import { Company } from '../../entities/company.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ThirdParty, Company])],
  providers: [ThirdPartyService],
  controllers: [],
  exports: [ThirdPartyService],
})
export class ThirdPartyModule {}
