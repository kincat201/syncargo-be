import { Quotation } from 'src/entities/quotation.entity';
import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, OneToMany, ManyToOne } from 'typeorm';
import { BidPrice } from './bid-price.entity';
import { RfqStatus } from '../enums/enum';

@Entity({ name: 't_bids' })
export class Bid {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'shipping_line',
  })
  shippingLine: string;

  @Column({
    name: 'rfq_id',
  })
  rfqId: number;

  @Column({
    name: 'vendor_name',
  })
  vendorName: string;

  @Column({
    name: 'min_delivery'
  })
  minDelivery: number;

  @Column({
    name: 'max_delivery'
  })
  maxDelivery: number;

  @Column({
    nullable: true,
    length: 500,
  })
  note: string;

  @Column({
    length: 8,
    default: 'IDR',
  })
  currency: string;

  @Column({
    name: 'company_id',
    nullable: true,
  })
  companyId: number;

  @Column({
    default: 1,
  })
  status: number;

  @Column({
    name: 'rfq_status',
    type: 'enum',
    enum: RfqStatus,
    default: RfqStatus.DRAFT,
  })
  rfqStatus: RfqStatus;

  @Column({
    name: 'valid_until',
    length: 10,
    nullable: true
  })
  validUntil: string;

  @Column({
    name: 'rfq_expired',
    length: 10,
    nullable: true
  })
  rfqExpired: string;

  @Column({
    name: 'created_by_user_id',
    nullable: true,
  })
  createdByUserId: number;

  @Column({
    name: 'updated_by_user_id',
    nullable: true,
  })
  updatedByUserId: number;

  // NOTE: if failed by customer, it must be the owner of this quotaion
  // refer to this.customerId, this column must be null
  // also refer to this.rfqStatus to know if this quotation rejected or cancelled
  @Column({
    name: "failed_by_company_id",
    nullable: true,
  })
  failedByCompanyId: number;

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

  // Relation
  @ManyToOne(() => Quotation, (quotation) => quotation.bids)
  @JoinColumn([{ name: 'rfq_id', referencedColumnName: 'id' }])
  quotation: Quotation;

  @OneToMany(() => BidPrice, (bidprice) => bidprice.bid)
  bidprices: BidPrice[];
}
