import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from '../../entities/company.entity';
import { Shipment } from '../../entities/shipment.entity';
import { HblDynamicHistory } from '../../entities/hbl-dynamic-history.entity';
import { HblDynamicImages } from '../../entities/hbl-dynamic-images.entity';
import { HblDynamicService } from './hbl-dynamic.service';
import { S3Module } from '../../s3/s3.module';
import { HblDynamicController } from './hbl-dynamic.controller';
import { RedisModule } from '../../redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Company,
      Shipment,
      HblDynamicHistory,
      HblDynamicImages,
    ]),
    S3Module,
    RedisModule,
  ],
  controllers:[HblDynamicController],
  providers: [HblDynamicService],
  exports: [HblDynamicService],
})
export class HblDynamicModule {}
