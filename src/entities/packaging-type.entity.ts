import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'm_packaging_types' })
export class PackagingType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({
    name: 'shipment_type_code'
  })
  shipmentTypeCode: string;

}
