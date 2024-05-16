import { Shipment } from 'src/entities/shipment.entity';
import { OngoingOtif } from 'src/enums/enum';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';

@Entity({ name: 't_shipment_delay_files' })
export class ShipmentDelayFile {
  @PrimaryGeneratedColumn()
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
    name: 'file_container',
  })
  fileContainer: string;

  @Column({
    name: 'file_name',
  })
  fileName: string;
  
  @Column({
    name: 'original_name',
  })
  originalName: string;

  @Column()
  url: string;

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

  // Relation
  @ManyToOne(() => Shipment, (shipment) => shipment.shipmentDelayFiles)
  @JoinColumn({ name: 'rfq_number', referencedColumnName: 'rfqNumber' })
  shipment: Shipment;

}
