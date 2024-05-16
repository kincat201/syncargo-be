import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RedisModule } from '../redis/redis.module';
import { QontakService } from './qontak.service';
import { QontakLogs, QontakLogsSchema } from '../schemas/qontakLogs.schema';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: QontakLogs.name, schema: QontakLogsSchema },
    ]),
    RedisModule,
  ],
  providers: [QontakService],
  controllers: [],
  exports: [QontakService],
})
export class QontakModule {}
