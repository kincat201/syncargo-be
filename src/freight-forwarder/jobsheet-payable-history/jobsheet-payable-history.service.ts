import {
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, Repository } from 'typeorm';
import { SubmitJobSheetPayableHistory } from './dtos/submit-jobsheet-payable-history';
import { JobSheetPayableHistory } from '../../entities/job-sheet-payable-history.entity';

@Injectable()
export class JobSheetPayableHistoryService {
  constructor(
    @InjectRepository(JobSheetPayableHistory) private jobSheetPayableHistoryRepo: Repository<JobSheetPayableHistory>,
    private connection: Connection,
  ) {}

  async submit(userId: number, jobSheetPayableId: number, body: SubmitJobSheetPayableHistory) {
    return await this.connection.transaction(async (entityManager) => {
      const jobSheetPayableHistory = this.jobSheetPayableHistoryRepo.create({
        jobSheetPayableId,
        createdByUserId: userId,
        ...body,
      });

      return await entityManager.save(jobSheetPayableHistory);
    });
  }
}
