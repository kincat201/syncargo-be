import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RedisModule } from '../../redis/redis.module';
import { CeisaImport, CeisaImportSchema } from '../../schemas/ceisaImport.schema';
import { CeisaExport, CeisaExportSchema } from '../../schemas/ceisaExport.schema';
import { CeisaService } from './ceisa.service';
import { CeisaLogs, CeisaLogsSchema } from '../../schemas/ceisaLogs.schema';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shipment } from '../../entities/shipment.entity';
import { S3Module } from '../../s3/s3.module';
import { Helper } from '../helpers/helper';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      Shipment,
    ]),
    MongooseModule.forFeature([
      { name: CeisaImport.name, schema: CeisaImportSchema },
      { name: CeisaExport.name, schema: CeisaExportSchema },
      { name: CeisaLogs.name, schema: CeisaLogsSchema},
    ]),
    S3Module,
    RedisModule,
  ],
  providers: [CeisaService,Helper],
  controllers: [],
  exports: [CeisaService],
})
export class CeisaModule {}
