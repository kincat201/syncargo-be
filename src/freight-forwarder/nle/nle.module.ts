import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NleService } from './nle.service';
import { RedisModule } from '../../redis/redis.module';
import { NleLogs, NleLogsSchema } from '../../schemas/nleLogs.schema';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: NleLogs.name, schema: NleLogsSchema },
    ]),
    RedisModule,
  ],
  providers: [NleService],
  controllers: [],
  exports: [NleService],
})
export class NleModule {}
