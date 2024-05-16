import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from 'src/redis/redis.module';
import { S3Module } from 'src/s3/s3.module';
import { QuotationFile } from 'src/entities/quotation-file.entity';
import { QuotationFilesService } from './quotation-files.service';

@Module({
  imports: [TypeOrmModule.forFeature([QuotationFile]), S3Module],
  providers: [QuotationFilesService],
  exports: [QuotationFilesService],
})
export class QuotationFilesModule {}
