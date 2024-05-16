import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, ManyToOne, OneToMany } from 'typeorm'
import { OngoingOtif } from 'src/enums/enum'
import { Shipment } from 'src/entities/shipment.entity';
import { ShipmentDelayFile } from './shipment-delay-file.entity';

@Entity({ name: 't_shipment_delays' })
export class ShipmentDelay {
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
    enum: OngoingOtif,
  })
  otifStatus: OngoingOtif;
  
  @Column({
    name: 'delay_date',
    type: 'date',
  })
  delayDate: Date;

  @Column({
    name: 'estimated_delay_until',
    type: 'date',
  })
  estimatedDelayUntil: Date;

  @Column()
  note: string;

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
  @ManyToOne(() => Shipment, (shipment) => shipment.shipmentDelays)
  @JoinColumn([{ name: 'rfq_number', referencedColumnName: 'rfqNumber' }])
  shipment: Shipment;
  
}