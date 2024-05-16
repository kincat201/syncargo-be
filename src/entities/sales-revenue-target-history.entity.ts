import { ManyToOne, Entity, PrimaryGeneratedColumn, Column, JoinColumn } from 'typeorm'
import { User } from './user.entity';

@Entity({ name: 't_sales_revenue_target_histories' })
export class SalesRevenueTargetHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'user_id',
  })
  userId: number;

  @Column({
    name: 'company_id',
  })
  companyId: number;

  @Column({
    nullable: true,
  })
  action: string;

  @Column({
    nullable: true,
  })
  period: string;

  @Column({
    name: 'revenue_target',
    type: 'decimal',
    precision: 16,
    scale: 2,
    default: 0,
  })
  revenueTarget: number;

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

  @ManyToOne(() => User, (user) => user.shipmentHistory)
  @JoinColumn([{ name: 'created_by_user_id', referencedColumnName: 'userId' }])
  creator: User;

}