import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Invoice } from './invoice.entity';
import { InvoiceHistoryStatusApproval } from '../enums/enum';
import { User } from './user.entity';
import { InvoicePrice } from './invoice-price.entity';
import { ThirdParty } from './third-party.entity';
import { Customer } from './customer.entity';

@Entity({ name: 't_invoice_histories' })
export class InvoiceHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'invoice_number',
  })
  invoiceNumber: string;

  @Column({
    name: 'invoice_number_current',
  })
  invoiceNumberCurrent: string;

  @Column({
    length: 8,
    default: 'IDR',
  })
  currency: string;

  @Column({
    name: 'sub_total',
    type: 'decimal',
    precision: 16,
    scale: 2,
    nullable: true,
  })
  subTotal: number;

  @Column({
    nullable: true,
  })
  total: number;

  @Column({
    name: 'total_currency',
    nullable: true,
    type: 'decimal',
    precision: 16,
    scale: 2,
  })
  totalCurrency: number;

  @Column({
    name: 'remaining_amount',
    type: 'decimal',
    precision: 16,
    scale: 2,
    default: 0,
    nullable: true,
  })
  remainingAmount: number;

  @Column({
    name: 'remaining_amount_currency',
    type: 'decimal',
    precision: 16,
    scale: 2,
    default: 0,
    nullable: true,
  })
  remainingAmountCurrency: number;

  @Column({
    name: 'exchange_rate',
    type: 'decimal',
    precision: 16,
    scale: 2,
    default: 1,
  })
  exchangeRate: number;

  @Column({
    name: 'customer_id',
    nullable: true,
  })
  customerId: string;

  @Column({
    name: 'third_party_id',
    type: 'int',
    nullable: true,
  })
  thirdPartyId: number;

  @Column({
    name: 'default_ppn',
    type: 'boolean',
    default: false,
  })
  defaultPpn: boolean;

  @Column({
    type: 'double',
    name: 'ppn',
    default: 0,
  })
  ppn: number;

  @Column({
    default: 1,
  })
  status: number;

  @Column({
    name: 'status_approval',
    type: 'enum',
    enum: InvoiceHistoryStatusApproval,
    default: InvoiceHistoryStatusApproval.NEED_APPROVAL,
  })
  statusApproval: string;

  @Column({
    name: 'created_by_user_id',
  })
  createdByUserId: number;

  @Column({
    name: 'approved_by_user_id',
    nullable: true,
  })
  approvedByUserId: number;

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

  @Column({
    name: 'reference_number',
    length: 25,
    default: null,
  })
  referenceNumber: string;

  @Column({
    name: 'invoice_date',
  })
  invoiceDate: string;

  @Column({
    name: 'due_date',
  })
  dueDate: string;

  //Relations

  @ManyToOne(() => Invoice, (invoice) => invoice.invoiceHistories)
  @JoinColumn([
    { name: 'invoice_number', referencedColumnName: 'invoiceNumber' },
  ])
  invoice: Invoice;

  @ManyToOne(() => ThirdParty, (thirdParty) => thirdParty.invoiceHistories)
  @JoinColumn([{ name: 'third_party_id', referencedColumnName: 'id' }])
  thirdParty: ThirdParty;

  @OneToMany(
    () => InvoicePrice,
    (invoicePrices) => invoicePrices.invoiceHistory,
  )
  @JoinColumn({ name: 'id', referencedColumnName: 'invoiceHistoryId' })
  invoicePrices: InvoicePrice[];

  @ManyToOne(() => User, (user) => user.invoiceHistory)
  @JoinColumn([{ name: 'created_by_user_id', referencedColumnName: 'userId' }])
  creator: User;

  @ManyToOne(() => User, (user) => user.approvalInvoiceHistory)
  @JoinColumn([{ name: 'approved_by_user_id', referencedColumnName: 'userId' }])
  approvedBy: User;

  @ManyToOne(() => ThirdParty, (thirdParty) => thirdParty.invoiceHistories)
  @JoinColumn({ name: 'third_party_id', referencedColumnName: 'id' })
  thirdParties: ThirdParty;

  @ManyToOne(() => Customer, (customer) => customer.invoiceHistories)
  @JoinColumn([{ name: 'customer_id', referencedColumnName: 'customerId' }])
  customer: Customer;
}
