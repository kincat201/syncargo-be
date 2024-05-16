import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Company } from './company.entity';
import { Port } from './port.entity';

@Entity({ name: 'm_countries' })
export class Country {
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
    name: 'country_code',
  })
  countryCode: string;

  @Column({
    name: 'city_total',
    default: 0,
  })
  cityTotal: number;

  @Column({
    name: 'created_by_user_id',
    nullable: true,
  })
  createdBy: number;

  @Column({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Company, (company) => company.countries)
  @JoinColumn([{ name: 'company_id', referencedColumnName: 'id' }])
  company: Company;

  @OneToMany(() => Port, (port) => port.company)
  ports: Port[]
  
}
