import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OcrDocument } from '../../entities/ocr-document.entity';
import { OcrDocumentHistory } from '../../entities/ocr-document-history.entity';
import { OcrService } from './ocr.service';
import { OcrController } from './ocr.controller';
import { UsersModule } from '../users/users.module';
import { S3Module } from '../../s3/s3.module';
import { RedisModule } from 'src/redis/redis.module';
import { CompaniesModule } from '../companies/companies.module';

@Module({
    controllers: [OcrController],
    providers: [OcrService],
    exports: [OcrService],
    imports : [
        TypeOrmModule.forFeature([
            OcrDocument,
            OcrDocumentHistory,
        ]),
        CompaniesModule,
        UsersModule,
        S3Module,
        RedisModule,
    ],
})

export class OcrModule {}