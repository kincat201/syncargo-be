import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserHistoriesService } from './user-histories.service';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import {
  UserHistory,
  UserHistorySchema,
} from '../../schemas/userHistory.schema';

@Module({
  imports: [
    TypeOrmModule.forFeature([]),
    MongooseModule.forFeature([
      { name: UserHistory.name, schema: UserHistorySchema },
    ]),
    ConfigModule,
  ],
  providers: [UserHistoriesService],
  controllers: [],
  exports: [UserHistoriesService],
})
export class UserHistoriesModule {}
