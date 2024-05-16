import { ManyToOne, Entity, PrimaryGeneratedColumn, Column, JoinColumn } from 'typeorm'
import { User } from './user.entity';
import { JobSheetPayable } from './job-sheet-payable.entity';
import { Invoice } from './invoice.entity';

@Entity({ name: 't_job_sheet_receivable_payments' })
export class JobSheetReceivablePayment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'invoice_number',
  })
  invoiceNumber: number;

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
    name: 'amount_paid_currency',
    type: 'decimal',
    precision: 16,
    scale: 2,
    nullable: true,
  })
  amountPaidCurrency: number;

  @Column({
    name: 'amount_remaining',
    type: 'decimal',
    precision: 16,
    scale: 2,
    nullable: true,
  })
  amountRemaining: number;

  @Column({
    name: 'amount_remaining_currency',
    type: 'decimal',
    precision: 16,
    scale: 2,
    nullable: true,
  })
  amountRemainingCurrency: number;

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

  @ManyToOne(() => Invoice, (invoice) => invoice.receivablePayments)
  @JoinColumn([{ name: 'invoice_number', referencedColumnName: 'invoiceNumber' }])
  invoice: Invoice;
}