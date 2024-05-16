import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, ManyToOne } from 'typeorm'
import { OtifStatus, ShipmentStatus } from 'src/enums/enum'
import { Shipment } from 'src/entities/shipment.entity';

@Entity({ name: 't_shipment_otifs' })
export class ShipmentOtif {
  @PrimaryGeneratedColumn({
    name: 'id',
  })
  id: number;

  @Column({
    name: 'rfq_number',
  })
  rfqNumber: string;

  @Column({
    name: 'otif_status',
    type: 'enum',
    enum: OtifStatus,
  })
  otifStatus: OtifStatus;
  
  @Column({
    name: 'document_date',
    type: 'date',
    nullable: true,
  })
  documentDate: Date;

  @Column({
    type: 'date',
    nullable: true,
  })
  etd: Date;

  @Column({
    name: 'etd_time',
    nullable: true,
  })
  etdTime: String;

  @Column({
    type: 'date',
    nullable: true,
  })
  eta: Date;

  @Column({
    name: 'eta_time',
    nullable: true,
  })
  etaTime: String;

  @Column({
    name: 'pickup_date',
    type: 'date',
    nullable: true,
  })
  pickupDate: Date;

  @Column({
    name: 'pickup_time',
    type: 'time',
    nullable: true,
  })
  pickupTime: Date;

  @Column({
    nullable: true,
  })
  location: string;

  @Column({
    name: 'driver_name',
    nullable: true,
  })
  driverName: string;

  @Column({
    name: 'driver_phone',
    nullable: true,
  })
  driverPhone: string;

  @Column({
    name: 'vehicle_plate_number',
    nullable: true,
  })
  vehiclePlateNumber: string;

  @Column({
    name: 'gross_weight',
    type: 'decimal',
    precision: 16,
    scale: 2,
    nullable: true,
  })
  grossWeight: number;

  @Column({
    name: 'nett_weight',
    type: 'decimal',
    precision: 16,
    scale: 2,
    nullable: true,
  })
  nettWeight: number;

  @Column({
    name: 'master_awb',
    nullable: true,
  })
  masterAwb: string;

  @Column({
    name: 'house_awb',
    nullable: true,
  })
  houseAwb: string;

  @Column({
    nullable: true,
  })
  activity: string;

  @Column({
    name: 'no_peb',
    nullable: true,
  })
  noPeb: string;

  @Column({
    name: 'port_of_loading',
    nullable: true,
  })
  portOfLoading: string;

  @Column({
    name: 'shipping_line',
    nullable: true,
  })
  shippingLine: string;

  @Column({
    name: 'shipping_number',
    nullable: true,
  })
  shippingNumber: string;

  @Column({
    name: 'port_of_discharge',
    nullable: true,
  })
  portOfDischarge: string;

  @Column({
    name: 'reason_failed',
    nullable: true,
  })
  reasonFailed: string;

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

  // Relation
  @ManyToOne(() => Shipment, (shipment) => shipment.shipmentOtifs)
  @JoinColumn([{ name: 'rfq_number', referencedColumnName: 'rfqNumber' }])
  shipment: Shipment;
  
}