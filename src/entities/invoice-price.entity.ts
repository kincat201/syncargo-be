import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Invoice } from './invoice.entity';
import { InvoiceHistory } from './invoice-history.entity';

@Entity({ name: 't_invoice_prices' })
export class InvoicePrice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'rfq_number',
  })
  rfqNumber: string;

  @Column({
    name: 'invoice_number',
  })
  invoiceNumber: string;

  @Column({
    name: 'price_component',
  })
  priceComponent: string;

  @Column()
  uom: string;

  @Column({
    type: 'decimal',
    precision: 16,
    scale: 2,
  })
  price: number;

  // price in idr
  @Column({
    name: 'converted_price',
    type: 'decimal',
    precision: 16,
    scale: 2,
    default: 0,
  })
  convertedPrice: number;

  @Column()
  qty: number;

  @Column({
    type: 'decimal',
    precision: 16,
    scale: 2,
  })
  subtotal: number;

  @Column({
    type: 'decimal',
    precision: 16,
    scale: 2,
    name: 'subtotal_currency',
  })
  subtotalCurrency: number;

  @Column({
    type: 'double',
    default: 0,
  })
  ppn: number;

  // total in idr
  @Column({
    type: 'decimal',
    precision: 16,
    scale: 2,
  })
  total: number;

  // total in user currency
  @Column({
    type: 'decimal',
    precision: 16,
    scale: 2,
    name: 'total_currency',
  })
  totalCurrency: number;

  @Column({
    default: 1,
  })
  status: number;

  @Column({
    nullable: true,
  })
  note: string;

  @Column({
    name: 'invoice_history_id',
  })
  invoiceHistoryId: number;

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

  //Relations

  @ManyToOne(() => Invoice, (invoice) => invoice.invoicePrices)
  @JoinColumn([
    { name: 'invoice_number', referencedColumnName: 'invoiceNumber' },
  ])
  invoice: string;

  @ManyToOne(() => InvoiceHistory, (invoiceHistory) => invoiceHistory.invoicePrices)
  @JoinColumn([
    { name: 'invoice_history_id', referencedColumnName: 'id' },
  ])
  invoiceHistory: string;
}
