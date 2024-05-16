import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CreditCheck } from './credit-check.entity';
import { CreditCheckFileCategory } from '../enums/credit-check';

@Entity({ name: 't_credit_check_files' })
export class CreditCheckFile {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({
    name: 'file_container',
    nullable: false,
  })
  fileContainer: string;

  @Column({
    name: 'file_name',
    nullable: false,
  })
  fileName: string;

  @Column({
    name: 'original_name',
    nullable: false,
  })
  originalName: string;

  @Column({
    name: 'url',
    nullable: false,
  })
  url: string;

  @Column({
    name: 'category',
    nullable: false,
  })
  category: CreditCheckFileCategory;

  @Column({
    name: 'status',
    nullable: false,
    default: 1,
  })
  status?: number;

  @Column({
    name: 'created_by_user_id',
    nullable: true,
  })
  createdBy?: number;

  @Column({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt?: Date;

  @Column({
    name: 'file_size',
    nullable: false,
  })
  fileSize: number;

  // relations
  @ManyToOne(() => CreditCheck, (creditCheck) => creditCheck.creditCheckFiles)
  @JoinColumn([{ name: 'credit_check_id', referencedColumnName: 'id' }])
  creditCheck: CreditCheck;
}
