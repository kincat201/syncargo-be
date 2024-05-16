import { Shipment } from 'src/entities/shipment.entity';
import { ShipmentSellingPriceType } from 'src/enums/enum';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';

@Entity({ name: 't_shipment_selling_prices' })
export class ShipmentSelllingPrice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'rfq_number',
  })
  rfqNumber: string;

  @Column({
    type: 'enum',
    enum: ShipmentSellingPriceType,
    default: ShipmentSellingPriceType.SHIPMENT,
  })
  type: ShipmentSellingPriceType;

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

  @Column({
    default: 0,
  })
  qty: number;

  @Column({
    type: 'decimal',
    precision: 16,
    scale: 2,
    default: 0,
  })
  subtotal: number;

  // subtotal in user currency
  @Column({
    type: 'decimal',
    precision: 16,
    scale: 2,
    default: 0,
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
    default: 0,
  })
  total: number;

  // total in user currency
  @Column({
    type: 'decimal',
    precision: 16,
    scale: 2,
    default: 0,
    name: 'total_currency',
  })
  totalCurrency: number;

  @Column({
    nullable: true,
  })
  note: string;

  // if type === TEMP_INVOICE
  @Column({
    name: 'from_shipment',
    type: 'boolean',
    nullable: true,
  })
  fromShipment: boolean;

  @Column({
    default: 1,
  })
  status: number;

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

  @ManyToOne(() => Shipment, (shipment) => shipment.shipmentSellingPrice)
  @JoinColumn([{ name: 'rfq_number', referencedColumnName: 'rfqNumber' }])
  shipment: string;
}
