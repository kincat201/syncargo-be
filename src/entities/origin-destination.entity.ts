import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Company } from './company.entity';

@Entity({ name: 'm_origin_destination' })
export class OriginDestination {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'company_id',
  })
  companyId: number;
  
  @Column({
    name: 'country_name',
  })
  countryName: string;

  @Column({
    name: 'city_name',
  })
  cityName: string;

  @Column({
    name: 'country_code',
  })
  countryCode: string;

  @Column({
    name: 'city_code',
  })
  cityCode: string;

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
    name: 'updated_at',
    type: 'datetime',
    onUpdate: 'CURRENT_TIMESTAMP',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @Column({
    name: 'deleted_at',
    type: 'datetime',
    nullable: true,
  })
  deletedAt: Date;

  // Relations
  @ManyToOne(() => Company, (company) => company.originDestinations)
  @JoinColumn([{ name: 'company_id', referencedColumnName: 'id' }])
  company: Company;
}
