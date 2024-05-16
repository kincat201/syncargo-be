import { ManyToOne, Entity, PrimaryGeneratedColumn, Column, JoinColumn, OneToMany } from 'typeorm'
import { User } from './user.entity';
import { JobSheetPayableStatus } from '../enums/enum';
import { JobSheet } from './job-sheet.entity';
import { JobSheetPayableFile } from './job-sheet-payable-files.entity';
import { JobSheetPayableHistory } from './job-sheet-payable-history.entity';
import { JobSheetPayablePayment } from './job-sheet-payable-payment.entity';
import { JobSheetPayablePrice } from './job-sheet-payable-prices.entity';

@Entity({ name: 't_job_sheet_payables' })
export class JobSheetPayable {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'job_sheet_number',
  })
  jobSheetNumber: string;

  @Column({
    name: 'invoice_number',
    nullable: true,
  })
  invoiceNumber: string;

  @Column({
    name: 'vendor_name',
    nullable: true,
  })
  vendorName: string;

  @Column({
    name: 'payable_date',
    nullable: true,
  })
  payableDate: string;

  @Column({
    name: 'due_date',
    nullable: true,
  })
  dueDate: string;

  @Column({
    name: 'ap_status',
    type: 'enum',
    enum: JobSheetPayableStatus,
    default: JobSheetPayableStatus.WAITING_APPROVAL,
  })
  apStatus: string;

  @Column({
    name: 'note',
    nullable: true,
  })
  note: string;

  @Column({
    name: 'amount_due',
    type: 'json',
    nullable: true,
  })
  amountDue: any;

  @Column({
    name: 'amount_paid',
    type: 'json',
    nullable: true,
  })
  amountPaid: any;

  @Column({
    name: 'amount_remaining',
    type: 'json',
    nullable: true,
  })
  amountRemaining: any;
  
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

  @Column({
    name: 'updated_at',
    type: 'datetime',
    onUpdate: 'CURRENT_TIMESTAMP',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  // Relations // TODO: fix relation with rfqNumber

  @ManyToOne(() => User, (user) => user.quotations)
  @JoinColumn([{ name: 'created_by_user_id', referencedColumnName: 'userId' }])
  user: User;

  @ManyToOne(() => JobSheet, (jobSheet) => jobSheet.payables)
  @JoinColumn([{ name: 'job_sheet_number', referencedColumnName: 'jobSheetNumber' }])
  jobSheet: JobSheet;

  @OneToMany(() => JobSheetPayableFile, (jobSheetPayableFile) => jobSheetPayableFile.jobSheetPayable)
  files: JobSheetPayableFile[];

  @OneToMany(() => JobSheetPayableHistory, (jobSheetPayableHistory) => jobSheetPayableHistory.jobSheetPayable)
  histories: JobSheetPayableHistory[];

  @OneToMany(() => JobSheetPayablePayment, (jobSheetPayablePayment) => jobSheetPayablePayment.jobSheetPayable)
  payments: JobSheetPayablePayment[];

  @OneToMany(() => JobSheetPayablePrice, (jobSheetPayablePrice) => jobSheetPayablePrice.jobSheetPayable)
  prices: JobSheetPayablePrice[];
}