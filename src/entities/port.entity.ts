import { ShipmentVia } from 'src/enums/enum';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Company } from './company.entity';
import { Country } from './country.entity';

@Entity({ name: 'm_ports' })
export class Port {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'company_id',
  })
  companyId: number;

  @Column({
    name: 'country_code',
  })
  countryCode: string;

  @Column({
    name: 'port_type',
    type: 'enum',
    enum: ShipmentVia,
  })
  portType: ShipmentVia;

  @Column({
    name: 'port_name',
  })
  portName: string;

  @Column({
    default: 1,
  })
  status: number;

  @Column({
    name: 'created_by_user_id',
    nullable: true,
  })
  createdBy: number;

  @Column({
    name: 'updated_by_user_id',
    nullable: true,
  })
  updatedBy: number;

  @Column({
    name: 'deleted_by_user_id',
    nullable: true,
  })
  deletedBy: number;

  @Column({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @Column({
    name: 'deleted_at',
    type: 'datetime',
    nullable: true,
  })
  deletedAt: Date;

  @Column({
    name: 'updated_at',
    type: 'datetime',
    onUpdate: 'CURRENT_TIMESTAMP',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Company, (company) => company.ports)
  @JoinColumn([{ name: 'company_id', referencedColumnName: 'id' }])
  company: Company;

  @ManyToOne(() => Country, (country) => country.ports)
  @JoinColumn([{ name: 'country_code', referencedColumnName: 'countryCode' }])
  country: Country;
}
