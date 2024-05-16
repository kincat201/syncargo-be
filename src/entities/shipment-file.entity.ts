import { Shipment } from 'src/entities/shipment.entity';
import { FileStatus } from '../enums/enum';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity({ name: 't_shipment_files' })
export class ShipmentFile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'rfq_number',
  })
  rfqNumber: string;

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
    name: 'additional_information',
  })
  additionalInformation: string;

  @Column({
    name: 'platform',
    nullable: true,
  })
  platform: string;

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

  @Column({
    name: 'status',
    type: 'boolean',
    default: 1,
  })
  status: boolean;

  @Column({
    name: 'file_status',
  })
  fileStatus?: FileStatus;

  // Relation
  @ManyToOne(() => Shipment, (shipment) => shipment.shipmentFiles)
  @JoinColumn({ name: 'rfq_number', referencedColumnName: 'rfqNumber' })
  shipment: Shipment;
}
