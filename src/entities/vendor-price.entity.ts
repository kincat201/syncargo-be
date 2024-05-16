import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { BidPrice } from './bid-price.entity';
import { ShipmentType } from '../enums/enum';
import { VendorPriceComponent } from './vendor-price-component.entity';

@Entity({ name: 'm_vendor_prices' })
export class VendorPrice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  label: string;

  @Column({
    name: 'vendor_name',
  })
  vendorName: string;

  @Column({
    name: 'shipment_type',
    type: 'enum',
    enum: ShipmentType,
    nullable: true,
  })
  shipmentType: ShipmentType;

  @Column({
    name: 'country_from',
    nullable: true,
  })
  countryFrom: string;

  @Column({
    name: 'country_from_code',
    nullable: true,
  })
  countryFromCode: string;

  @Column({
    name: 'country_from_id',
    nullable: true,
  })
  countryFromId: number;

  @Column({
    name: 'city_from',
    nullable: true,
  })
  cityFrom: string;

  @Column({
    name: 'country_to',
    nullable: true,
  })
  countryTo: string;

  @Column({
    name: 'country_to_code',
    nullable: true,
  })
  countryToCode: string;

  @Column({
    name: 'country_to_id',
    nullable: true,
  })
  countryToId: number;

  @Column({
    name: 'city_to',
    nullable: true,
  })
  cityTo: string;

  @Column({
    length: 8,
    default: 'IDR',
  })
  currency: string;

  @Column({
    default: 1,
  })
  status: number;

  @Column({
    name: 'company_id',
    nullable: true,
  })
  companyId: number;

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

  @OneToMany(() => VendorPriceComponent, (priceComponents) => priceComponents.vendorPrice)
  priceComponents: VendorPriceComponent[];
}
