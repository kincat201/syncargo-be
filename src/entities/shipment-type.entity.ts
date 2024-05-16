import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'm_shipment_types' })
export class ShipmentType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  code: string;

}
