import {
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, Repository } from 'typeorm';
import { SubmitJobsheetReceivableHistory } from './dtos/submit-jobsheet-receivable-history';
import { JobSheetReceivableHistory } from '../../entities/job-sheet-receivable-history.entity';

@Injectable()
export class JobSheetReceivableHistoryService {
  constructor(
    @InjectRepository(JobSheetReceivableHistory) private jobSheetReceivableHistoryRepo: Repository<JobSheetReceivableHistory>,
    private connection: Connection,
  ) {}

  async submit(userId: number, invoiceId: number, body: SubmitJobsheetReceivableHistory) {
    return await this.connection.transaction(async (entityManager) => {
      const jobSheetReceivableHistory = this.jobSheetReceivableHistoryRepo.create({
        invoiceId,
        createdByUserId: userId,
        ...body,
      });

      return await entityManager.save(jobSheetReceivableHistory);
    });
  }
}
