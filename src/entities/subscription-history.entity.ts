import { Company } from '../entities/company.entity';
import { SubscriptionType } from 'src/enums/enum';
import {
  Entity,
  Column,
  JoinColumn,
  PrimaryGeneratedColumn,
  ManyToOne,
} from 'typeorm';

@Entity({ name: 't_subscription_histories' })
export class SubscriptionHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'company_id',
  })
  companyId: number;

  @Column({
    type: 'enum',
    enum: SubscriptionType,
  })
  type: SubscriptionType;

  @Column({
    name: 'active_date',
    length: 10,
  })
  activeDate: string;

  @Column({
    name: 'expiry_date',
    length: 10,
  })
  expiryDate: string;

  @Column()
  duration: number;

  @Column({
    name: 'created_by_user_id',
  })
  createdByUserId: number

  @Column({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Company, (company) => company.subscriptionHistories)
  @JoinColumn({ name: 'company_id', referencedColumnName: 'id' })
  company: Company;

}
