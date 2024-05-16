import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Bid } from './bid.entity';
import { VendorPrice } from './vendor-price.entity';

@Entity({ name: 'm_vendor_price_components' })
export class VendorPriceComponent {
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
    name: 'vendor_price_id',
  })
  vendorPriceId: number;

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

  @ManyToOne(() => VendorPrice, (vendorPrice) => vendorPrice.priceComponents)
  @JoinColumn([{ name: 'vendor_price_id', referencedColumnName: 'id' }])
  vendorPrice: VendorPrice;

}
