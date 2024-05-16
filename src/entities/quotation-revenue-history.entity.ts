import { ManyToOne, Entity, PrimaryGeneratedColumn, Column, JoinColumn } from 'typeorm'
import { User } from './user.entity';
import { Quotation } from './quotation.entity';

@Entity({ name: 't_quotation_revenue_histories' })
export class QuotationRevenueHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'rfq_number',
  })
  rfqNumber: string;

  @Column({
    name: 'company_id',
  })
  companyId: number;

  @Column({
    nullable: true,
  })
  action: string;

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

  @ManyToOne(() => Quotation, (quotation) => quotation.quotationRevenueHistories)
  @JoinColumn([{ name: 'rfq_number', referencedColumnName: 'rfqNumber' }])
  quotation: Quotation;

  @ManyToOne(() => User, (user) => user.shipmentHistory)
  @JoinColumn([{ name: 'created_by_user_id', referencedColumnName: 'userId' }])
  creator: User;

}