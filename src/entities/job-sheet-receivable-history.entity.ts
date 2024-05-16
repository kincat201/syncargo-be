import { ManyToOne, Entity, PrimaryGeneratedColumn, Column, JoinColumn } from 'typeorm'
import { User } from './user.entity';
import { JobSheetPayable } from './job-sheet-payable.entity';
import { JobSheetReceivableHistoryAction } from '../enums/enum';
import { Invoice } from './invoice.entity';

@Entity({ name: 't_job_sheet_receivable_histories' })
export class JobSheetReceivableHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'invoice_id',
  })
  invoiceId: number;

  @Column({
    name: 'action',
    type: 'enum',
    enum: JobSheetReceivableHistoryAction,
    default: JobSheetReceivableHistoryAction.CREATED,
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

  @ManyToOne(() => User, (user) => user.jobSheetReceivableHistory)
  @JoinColumn([{ name: 'created_by_user_id', referencedColumnName: 'userId' }])
  creator: User;

  @ManyToOne(() => Invoice, (invoice) => invoice.receivableHistories)
  @JoinColumn([{ name: 'invoice_id', referencedColumnName: 'id' }])
  invoice: Invoice;
}