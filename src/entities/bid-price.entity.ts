import { Exclude } from 'class-transformer';
import { PriceComponent } from 'src/entities/price-component.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Bid } from './bid.entity';

@Entity({ name: 't_bid_prices' })
export class BidPrice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'price_comp_name',
  })
  priceCompName: string;

  @Column()
  uom: string;

  @Column({
    type: 'decimal',
    precision: 16,
    scale: 2,
  })
  price: number;

  @Column({
    type: 'decimal',
    precision: 16,
    scale: 2,
  })
  profit: number;

  @Column({
    type: 'decimal',
    precision: 16,
    scale: 2,
  })
  total: number;

  @Column({
    nullable: true,
    length: 500,
  })
  note: string;

  @Column({
    default: 1,
  })
  status: number;

  @Column({
    name: 'bid_id',
  })
  bidId: number;

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

  @ManyToOne(() => Bid, (bid) => bid.bidprices)
  @JoinColumn([{ name: 'bid_id', referencedColumnName: 'id' }])
  bid: Bid;

}
