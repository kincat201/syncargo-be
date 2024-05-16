import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CreditCheck } from './credit-check.entity';
import { User } from './user.entity';

@Entity({ name: 't_credit_check_histories' })
export class CreditCheckHistory {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({
    name: 'action',
    nullable: false,
  })
  action: string;

  @Column({
    name: 'details',
    nullable: false,
  })
  details: string;

  @Column({
    name: 'status',
    nullable: false,
    default: 1,
  })
  status?: number;

  @Column({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt?: Date;

  // relations
  @ManyToOne(
    () => CreditCheck,
    (creditCheck) => creditCheck.creditCheckHistories,
  )
  @JoinColumn([{ name: 'credit_check_id', referencedColumnName: 'id' }])
  creditCheck: CreditCheck;

  @ManyToOne(() => User, (user) => user.creditCheckHistories)
  @JoinColumn([{ name: 'created_by_user_id', referencedColumnName: 'userId' }])
  createdBy: User;
}
