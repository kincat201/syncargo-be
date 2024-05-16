import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { S3Module } from 'src/s3/s3.module';
import { JobSheetPayableFile } from '../../entities/job-sheet-payable-files.entity';
import { JobSheetPayableFilesService } from './job-sheet-payable-files.service';

@Module({
  imports: [TypeOrmModule.forFeature([
    JobSheetPayableFile
  ]), S3Module],
  providers: [JobSheetPayableFilesService],
  exports: [JobSheetPayableFilesService],
})
export class JobSheetPayableFilesModule {}
