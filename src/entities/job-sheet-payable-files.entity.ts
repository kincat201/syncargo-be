import { ManyToOne, Entity, PrimaryGeneratedColumn, Column, JoinColumn } from 'typeorm'
import { User } from './user.entity';
import { JobSheetPayable } from './job-sheet-payable.entity';

@Entity({ name: 't_job_sheet_payable_files' })
export class JobSheetPayableFile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'job_sheet_payable_id',
  })
  jobSheetPayableId: number;

  @Column({
    name: 'file_container',
  })
  fileContainer: string;

  @Column({
    name: 'file_name',
  })
  fileName: string;

  @Column({
    name: 'original_name',
  })
  originalName: string;

  @Column()
  url: string;

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

  @ManyToOne(() => User, (user) => user.quotations)
  @JoinColumn([{ name: 'created_by_user_id', referencedColumnName: 'userId' }])
  user: User;

  @ManyToOne(() => JobSheetPayable, (jobSheetPayable) => jobSheetPayable.files)
  @JoinColumn([{ name: 'job_sheet_payable_id', referencedColumnName: 'id' }])
  jobSheetPayable: JobSheetPayable;
}