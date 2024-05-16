import { ExtendStatus } from 'src/enums/enum';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Bid } from './bid.entity';
import { Quotation } from './quotation.entity';

@Entity({ name: 't_quotation_extend_logs' })
export class QuotationExtendLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'rfq_number',
  })
  rfqNumber: string;

  @Column({
    length: 10
  })
  date: string;

  @Column({
    name: 'extend_status',
    type: 'enum',
    enum: ExtendStatus,
  })
  extendStatus: ExtendStatus;

  // must be by customer
  @Column({
    name: 'created_by_user_id',
  })
  createdByUserId: number;

  // must be by FF
  @Column({
    name: 'updated_by_user_id',
  })
  updatedByUserId: number;

  // must be by customer
  @Column({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  // must be by FF
  @Column({
    name: 'updated_at',
    type: 'datetime',
    onUpdate: 'CURRENT_TIMESTAMP',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @Column({
    name: 'bid_id',
  })
  bidId: number;
  
  // Relations

  @ManyToOne(() => Quotation, (quotation) => quotation.extendLogs)
  @JoinColumn([{ name: 'rfq_number', referencedColumnName: 'rfqNumber' }])
  quotation: Quotation;
  
  @ManyToOne(() => Bid, (bid) => bid.bidprices)
  @JoinColumn([{ name: 'bid_id', referencedColumnName: 'id' }])
  bid: Bid;
}
