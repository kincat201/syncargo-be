import { Customer } from 'src/entities/customer.entity';
import {
  InvoiceLabel,
  InvoiceProcess,
  InvoiceStatus,
  JobSheetReceivableStatus,
} from 'src/enums/enum';
import { Quotation } from 'src/entities/quotation.entity';
import { Shipment } from 'src/entities/shipment.entity';
import { ManyToOne, BeforeInsert, Entity, PrimaryGeneratedColumn, Column, JoinColumn, OneToMany, OneToOne } from 'typeorm'
import { PaymentHistory } from './payment-history.entity';
import { InvoiceRejectLog } from './invoice-reject-log.entity';
import { User } from './user.entity';
import { InvoicePrice } from './invoice-price.entity';
import { ThirdParty } from './third-party.entity';
import { InvoiceHistory } from './invoice-history.entity';
import { JobSheet } from './job-sheet.entity';
import { JobSheetReceivableHistory } from './job-sheet-receivable-history.entity';
import { JobSheetReceivablePayment } from './job-sheet-receivable-payment.entity';

@Entity({ name: 't_invoices' })
export class Invoice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'invoice_number',
    unique: true,
  })
  invoiceNumber: string;

  @Column({
    name: 'rfq_number',
  })
  rfqNumber: string;

  @Column({
    name: 'customer_id',
  })
  customerId: string;

  // issued

  @Column({
    name: 'invoice_date',
    nullable: true,
  })
  invoiceDate: string;

  @Column({
    name: 'due_date',
    nullable: true,
  })
  dueDate: string;

  @Column({
    name: 'sub_total',
    type: 'decimal',
    precision: 16,
    scale: 2,
    nullable: true,
  })
  subTotal: number; // TODO: remove

  @Column({
    name: 'materai',
    type: 'decimal',
    precision: 16,
    scale: 2,
    nullable: true,
  })
  materai: number; // TODO: remove

  @Column({
    name: 'advance',
    type: 'decimal',
    precision: 16,
    scale: 2,
    nullable: true,
  })
  advance: number; // TODO: remove

  // hasil Math.round()
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
    name: 'issued_date',
    nullable: true,
  })
  issuedDate: string;

  @Column({
    name: 'issued_by',
    nullable: true,
  })
  issuedBy: number;

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
  remainingAmountCurrency: string;

  // settled

  @Column({
    name: 'settled_date',
    nullable: true,
  })
  settledDate: string;

  @Column({
    name: 'settled_by',
    nullable: true,
  })
  settledBy: number;

  @Column({
    name: 'settled_amount',
    type: 'decimal',
    precision: 16,
    scale: 2,
    default: 0,
    nullable: true,
  })
  settledAmount: string;

  @Column({
    name: 'settled_amount_currency',
    nullable: true,
  })
  settledAmountCurrency: string;

  @Column({
    name: 'invoice_status',
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.PROFORMA,
  })
  invoiceStatus: string;

  @Column({
    name: 'invoice_process',
    type: 'enum',
    enum: InvoiceProcess,
    default: null,
  })
  invoiceProcess: string;

  @Column({
    name: 'invoice_label',
    type: 'enum',
    enum: InvoiceLabel,
    default: null,
  })
  invoiceLabel: string;

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
    length: 8,
    default: 'IDR',
  })
  currency: string;

  @Column({
    default: 'Dollar',
    name: 'currency_unit',
  })
  currencyUnit: string;

  @Column({
    length: 8,
    default: 'IDR',
    name: 'paid_currency',
  })
  paidCurrency: string;

  @Column({
    name: 'exchange_rate',
    type: 'decimal',
    precision: 16,
    scale: 2,
    default: 1,
  })
  exchangeRate: number;

  @Column({
    default: 1,
  })
  status: number;

  @Column({
    name: 'created_by_company_id',
  })
  createdByCompanyId: number;

  @Column({
    name: 'created_by_user_id',
  })
  createdByUserId: number;

  @Column({
    name: 'updated_by_user_id',
    nullable: true,
  })
  updatedByUserId: number;

  @Column({
    name: 'deleted_by_user_id',
    nullable: true,
  })
  deletedByUserId: number;

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
    name: 'deleted_at',
    type: 'datetime',
    nullable: true,
  })
  deletedAt: Date;

  @Column({
    name: 'third_party_id',
    type: 'int',
    nullable: true,
  })
  thirdPartyId: number;

  @Column({
    name: 'need_approval',
    type: 'int',
    default: 0,
    nullable: true,
  })
  needApproval: number;

  @Column({
    name: 'reference_number',
    length: 25,
    default: null,
  })
  referenceNumber: string;

  @Column({
    name: 'job_sheet_number',
    unique: true,
  })
  jobSheetNumber: string;

  @Column({
    name: 'ar_status',
    type: 'enum',
    enum: JobSheetReceivableStatus,
    default: null,
  })
  arStatus: string;

  // Relations // TODO: fix relation with rfqNumber

  @OneToMany(() => PaymentHistory, (paymentHistory) => paymentHistory.invoice)
  @JoinColumn({ name: 'invoice_number', referencedColumnName: 'invoiceNumber' })
  paymentHistories: PaymentHistory[];

  @ManyToOne(() => Customer, (customer) => customer.invoices)
  @JoinColumn([{ name: 'customer_id', referencedColumnName: 'customerId' }])
  customer: Customer;

  @ManyToOne(() => Shipment, (shipment) => shipment.invoices)
  @JoinColumn([{ name: 'rfq_number', referencedColumnName: 'rfqNumber' }])
  shipment: Shipment;

  @ManyToOne(() => Quotation, (quotation) => quotation.invoices)
  @JoinColumn([{ name: 'rfq_number', referencedColumnName: 'rfqNumber' }])
  quotation: Quotation;

  @OneToMany(() => InvoiceRejectLog, (rejectLogs) => rejectLogs.invoice)
  @JoinColumn({ name: 'invoice_number', referencedColumnName: 'invoiceNumber' })
  rejectLogs: InvoiceRejectLog[];

  @ManyToOne(() => User, (user) => user.createdInvoices)
  @JoinColumn([{ name: 'created_by_user_id', referencedColumnName: 'userId' }])
  creatorInvoice: User; // ???

  @OneToMany(() => InvoicePrice, (invoicePrices) => invoicePrices.invoice)
  @JoinColumn({ name: 'invoice_number', referencedColumnName: 'invoiceNumber' })
  invoicePrices: InvoicePrice[];

  @ManyToOne(() => ThirdParty, (thirdParty) => thirdParty.invoices)
  @JoinColumn({ name: 'third_party_id', referencedColumnName: 'id' })
  thirdParties: ThirdParty;

  @OneToMany(() => InvoiceHistory, (invoiceHistory) => invoiceHistory.invoice)
  @JoinColumn({ name: 'invoice_number', referencedColumnName: 'invoiceNumber' })
  invoiceHistories: InvoiceHistory[];

  @ManyToOne(() => JobSheet, (jobSheet) => jobSheet.receivables)
  @JoinColumn([{ name: 'job_sheet_number', referencedColumnName: 'jobSheetNumber' }])
  jobSheet: JobSheet;

  @OneToMany(() => JobSheetReceivableHistory, (jobSheetReceivableHistory) => jobSheetReceivableHistory.invoice)
  @JoinColumn({ name: 'invoice_id', referencedColumnName: 'invoiceId' })
  receivableHistories: JobSheetReceivableHistory[];

  @OneToMany(() => JobSheetReceivablePayment, (jobSheetReceivablePayment) => jobSheetReceivablePayment.invoice)
  @JoinColumn({ name: 'invoice_id', referencedColumnName: 'invoiceId' })
  receivablePayments: JobSheetReceivablePayment[];

  //Hooks

  @BeforeInsert()
  async defaultZero() {
    this.advance = 0;
    this.materai = 0;
  }
}