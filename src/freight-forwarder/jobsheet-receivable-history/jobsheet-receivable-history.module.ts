import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobSheetReceivableHistoryService } from './jobsheet-receivable-history.service';
import { Invoice } from '../../entities/invoice.entity';
import { JobSheetReceivableHistory } from '../../entities/job-sheet-receivable-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([JobSheetReceivableHistory,Invoice])],
  providers: [JobSheetReceivableHistoryService],
  exports: [JobSheetReceivableHistoryService],
})
export class JobSheetReceivableHistoryModule {}
