import { Invoice } from 'src/entities/invoice.entity';
import { ManyToOne, Entity, PrimaryGeneratedColumn, Column, JoinColumn } from 'typeorm'

@Entity({ name: 't_invoice_reject_logs' })
export class InvoiceRejectLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'invoice_number',
  })
  invoiceNumber: string;

  @Column({
    name: 'reject_date',
    nullable: true,
  })
  rejectDate: Date;

  @Column({
    name: 'invoice_date',
    nullable: true,
  })
  invoiceDate: Date;

  @Column({
    name: 'reason',
    nullable: true,
  })
  reason: string;

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

  @ManyToOne(() => Invoice, (invoice) => invoice.rejectLogs)
  @JoinColumn([{ name: 'invoice_number', referencedColumnName: 'invoiceNumber' }])
  invoice: Invoice;

}