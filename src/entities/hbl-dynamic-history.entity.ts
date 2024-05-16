import { ManyToOne, Entity, PrimaryGeneratedColumn, Column, JoinColumn } from 'typeorm'
import { Shipment } from './shipment.entity';
import { Company } from './company.entity';
import { User } from './user.entity';

@Entity({ name: 't_hbl_dynamic_histories' })
export class HblDynamicHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'company_id',
  })
  companyId: number;

  @Column({
    name: 'rfq_number',
    nullable: true,
  })
  rfqNumber: string;

  @Column({
    nullable: true,
  })
  activity: string;

  // general

  @Column({
    default: 1,
  })
  status: number;

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

  // Relations

  @ManyToOne(() => Company, (company) => company.hblDynamicCompanyHistories)
  @JoinColumn([{ name: 'company_id', referencedColumnName: 'id' }])
  company: Company;

  @ManyToOne(() => Shipment, (shipment) => shipment.hblDynamicShipmentHistories)
  @JoinColumn([{ name: 'rfq_number', referencedColumnName: 'rfqNumber' }])
  shipment: Shipment;

  @ManyToOne(() => User, (user) => user.hblDynamicHistories)
  @JoinColumn([{ name: 'created_by_user_id', referencedColumnName: 'userId' }])
  creator: User;

}