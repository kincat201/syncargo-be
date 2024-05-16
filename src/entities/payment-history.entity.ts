import { Invoice } from 'src/entities/invoice.entity';
import { ManyToOne, Entity, PrimaryGeneratedColumn, Column, JoinColumn } from 'typeorm'
import { PaymentHistoryPaymentStatus } from '../enums/enum';

@Entity({ name: 't_payment_histories' })
export class PaymentHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'invoice_number',
  })
  invoiceNumber: string;

  @Column({
    name: 'payment_date',
    nullable: true,
  })
  paymentDate: string;

  @Column({
    nullable: true,
  })
  bank: string;

  @Column({
    name: 'bank_holder',
    nullable: true,
  })
  bankHolder: string;

  @Column({
    name: 'payment_amount',
    type: 'decimal',
    precision: 16,
    scale: 2,
    default: 0,
    nullable: true,
  })
  paymentAmount: string;

  @Column({
    name: 'payment_amount_currency',
    nullable: true,
  })
  paymentAmountCurrency?: string;

  @Column({
    name: 'remaining_amount',
    type: 'decimal',
    precision: 16,
    scale: 2,
    default: 0,
    nullable: true,
  })
  remainingAmount: string;

  @Column({
    name: 'remaining_amount_currency',
    nullable: true,
  })
  remainingAmountCurrency?: string;

  // file

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
    name: 'payment_status',
    type: 'enum',
    enum: PaymentHistoryPaymentStatus,
    default: null,
  })
  paymentStatus: PaymentHistoryPaymentStatus;

  @Column({
    name: 'reject_reason',
    default: null,
  })
  rejectReason: string;

  @Column({
    name: 'paid_currency',
    default: 'IDR',
  })
  paidCurrency: string;

  // general

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

  // Relations

  @ManyToOne(() => Invoice, (invoice) => invoice.paymentHistories)
  @JoinColumn([{ name: 'invoice_number', referencedColumnName: 'invoiceNumber' }])
  invoice: Invoice;

}