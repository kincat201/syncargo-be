import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from 'src/redis/redis.module';
import { User } from 'src/entities/user.entity';
import { Company } from 'src/entities/company.entity';
import { Bank } from 'src/entities/bank.entity';
import { BanksService } from './banks.service';
@Module({
  imports: [TypeOrmModule.forFeature([Bank])],
  providers: [BanksService],
  exports: [BanksService],
})
export class BanksModule {}
