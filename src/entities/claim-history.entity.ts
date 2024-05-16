import { Company } from '../entities/company.entity';
import {
  Entity,
  Column,
  JoinColumn,
  PrimaryGeneratedColumn,
  ManyToOne,
} from 'typeorm';

@Entity({ name: 't_claim_histories' })
export class ClaimHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'company_id',
  })
  companyId: number;

  @Column({
    default: 10,
  })
  point: number;

  @Column({
    name: 'ff_user_id',
  })
  ffUserId: number;

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

  @Column({
    type: 'boolean',
    default: true,
  })
  status: boolean;

  // Relations
  // @ManyToOne(() => Company, (company) => company.claimHistories)
  // @JoinColumn({ name: 'company_id', referencedColumnName: 'id' })
  // company: Company;
}
