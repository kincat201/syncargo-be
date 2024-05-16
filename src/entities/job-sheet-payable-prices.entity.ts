import { ManyToOne, Entity, PrimaryGeneratedColumn, Column, JoinColumn } from 'typeorm'
import { User } from './user.entity';
import { JobSheetPayable } from './job-sheet-payable.entity';

@Entity({ name: 't_job_sheet_payable_prices' })
export class JobSheetPayablePrice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'job_sheet_payable_id',
  })
  jobSheetPayableId: number;

  @Column({
    name: 'price_component',
  })
  priceComponent: string;

  @Column()
  uom: string;

  @Column({
    length: 8,
    default: 'IDR',
  })
  currency: string;

  @Column({
    name: 'price_amount',
    type: 'decimal',
    precision: 16,
    scale: 2,
  })
  priceAmount: number;

  @Column({
    default: 0,
  })
  qty: number;

  @Column({
    type: 'double',
    default: 0,
  })
  ppn: number;

  @Column({
    name: 'total_price',
    type: 'decimal',
    precision: 16,
    scale: 2,
  })
  totalPrice: number;

  @Column({
    name: 'created_by_user_id',
  })
  createdByUserId: number;

  @Column({
    default: 1,
  })
  status: number;

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

  @ManyToOne(() => JobSheetPayable, (jobSheetPayable) => jobSheetPayable.prices)
  @JoinColumn([{ name: 'job_sheet_payable_id', referencedColumnName: 'id' }])
  jobSheetPayable: JobSheetPayable;
}