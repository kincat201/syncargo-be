import { ManyToOne, Entity, PrimaryGeneratedColumn, Column, JoinColumn } from 'typeorm'
import { User } from './user.entity';
import { JobSheetPayable } from './job-sheet-payable.entity';
import { JobSheetPayableHistoryAction } from '../enums/enum';

@Entity({ name: 't_job_sheet_payable_histories' })
export class JobSheetPayableHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'job_sheet_payable_id',
  })
  jobSheetPayableId: number;

  @Column({
    name: 'action',
    type: 'enum',
    enum: JobSheetPayableHistoryAction,
    default: JobSheetPayableHistoryAction.CREATED,
  })
  action: string;

  @Column({
    name: 'details',
  })
  details: string;

  @Column({
    default: 1,
  })
  status: number;

  @Column({
    name: 'created_by_user_id',
  })
  createdByUserId: number;

  @Column({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  // Relations // TODO: fix relation with rfqNumber

  @ManyToOne(() => User, (user) => user.jobSheetPayableHistory)
  @JoinColumn([{ name: 'created_by_user_id', referencedColumnName: 'userId' }])
  creator: User;

  @ManyToOne(() => JobSheetPayable, (jobSheetPayable) => jobSheetPayable.histories)
  @JoinColumn([{ name: 'job_sheet_payable_id', referencedColumnName: 'id' }])
  jobSheetPayable: JobSheetPayable;
}