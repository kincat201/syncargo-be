import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RedisModule } from '../redis/redis.module';
import { QiscusService } from './qiscus.service';
import { QiscusLogs, QiscusLogsSchema } from '../schemas/qiscusLogs.schema';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: QiscusLogs.name, schema: QiscusLogsSchema },
    ]),
    RedisModule,
  ],
  providers: [QiscusService],
  controllers: [],
  exports: [QiscusService],
})
export class QiscusModule {}
