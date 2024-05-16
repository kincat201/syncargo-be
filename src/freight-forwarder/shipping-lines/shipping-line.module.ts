import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  SearatesLogs,
  SearatesLogsSchema,
} from '../../schemas/searatesLogs.schema';
import { RedisModule } from '../../redis/redis.module';
import { ShippingLineService } from './shipping-line.service';
import { ShippingLineController } from './shipping-line.controller';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: SearatesLogs.name, schema: SearatesLogsSchema },
    ]),
    RedisModule,
  ],
  providers: [ShippingLineService],
  controllers: [ShippingLineController],
  exports: [ShippingLineService],
})
export class ShippingLineModule {}
