import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobSheetPayableHistoryService } from './jobsheet-payable-history.service';
import { JobSheetPayableHistory } from '../../entities/job-sheet-payable-history.entity';
import { JobSheetPayable } from '../../entities/job-sheet-payable.entity';

@Module({
  imports: [TypeOrmModule.forFeature([JobSheetPayableHistory, JobSheetPayable])],
  providers: [JobSheetPayableHistoryService],
  exports: [JobSheetPayableHistoryService],
})
export class JobSheetPayableHistoryModule {}
