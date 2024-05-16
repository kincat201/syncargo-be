import { ManyToOne, Entity, PrimaryGeneratedColumn, Column, JoinColumn } from 'typeorm'
import { User } from './user.entity';
import { JobSheetPayable } from './job-sheet-payable.entity';

@Entity({ name: 't_job_sheet_payable_payments' })
export class JobSheetPayablePayment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'job_sheet_payable_id',
  })
  jobSheetPayableId: number;

  @Column({
    name: 'currency',
    nullable: true,
    default: 'IDR',
  })
  currency: string;

  @Column({
    name: 'amount_paid',
    type: 'decimal',
    precision: 16,
    scale: 2,
    nullable: true,
  })
  amountPaid: number;

  @Column({
    name: 'amount_remaining',
    type: 'decimal',
    precision: 16,
    scale: 2,
    nullable: true,
  })
  amountRemaining: number;

  @Column({
    name: 'payment_date',
    nullable: true,
  })
  paymentDate: string;

  @Column({
    name: 'bank_account',
    nullable: true,
  })
  bankAccount: string;

  @Column({
    name: 'bank_holder',
    nullable: true,
  })
  bankHolder: string;

  @Column({
    name: 'file_container',
    nullable: true,
  })
  fileContainer: string;

  @Column({
    name: 'file_name',
    nullable: true,
  })
  fileName: string;

  @Column({
    name: 'original_name',
    nullable: true,
  })
  originalName: string;

  @Column({
    nullable: true,
  })
  url: string;

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

  @ManyToOne(() => User, (user) => user.quotations)
  @JoinColumn([{ name: 'created_by_user_id', referencedColumnName: 'userId' }])
  user: User;

  @ManyToOne(() => JobSheetPayable, (jobSheetPayable) => jobSheetPayable.payments)
  @JoinColumn([{ name: 'job_sheet_payable_id', referencedColumnName: 'id' }])
  jobSheetPayable: JobSheetPayable;
}