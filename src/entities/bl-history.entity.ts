import { Company } from './company.entity';

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BlStatusType, BlType } from '../enums/enum';

@Entity({ name: 't_bl_histories' })
export class BlHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'company_id',
    type: 'int',
  })
  companyId: number;

  @Column({
    name: 'original_name',
  })
  originalName: string;

  @Column({
    name: 'url',
  })
  url: string;

  @Column({
    name: 'status',
    enum: BlStatusType,
    default: BlStatusType.VALIDATION,
  })
  status: BlStatusType;

  @Column({
    name: 'type',
    enum: BlType,
  })
  type: BlType;

  @Column({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @Column({
    type: 'datetime',
    onUpdate: 'CURRENT_TIMESTAMP',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @Column({
    name: 'activity',
  })
  activity: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id', referencedColumnName: 'id' })
  company: Company;
}
