import { CreditCheckStatus } from '../enums/credit-check';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CreditCheckFile } from './credit-check-file.entity';
import { CreditCheckHistory } from './credit-check-history.entity';
import { Company } from './company.entity';

@Entity({ name: 't_credit_checks' })
export class CreditCheck {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({
    name: 'company_name',
    nullable: false,
  })
  companyName: string;

  @Column({
    name: 'npwp',
    nullable: false,
  })
  npwp: string;

  @Column({
    name: 'pic_name',
    nullable: false,
  })
  picName: string;

  @Column({
    name: 'phone_code',
    nullable: false,
  })
  phoneCode: string;

  @Column({
    name: 'phone_number',
    nullable: false,
  })
  phoneNumber: string;

  @Column({
    name: 'location',
    nullable: false,
  })
  location: string;

  @Column({
    name: 'status',
    nullable: false,
    default: 1,
  })
  status?: number;

  @Column({
    name: 'check_status',
    nullable: false,
    default: CreditCheckStatus.WAITING_FOR_PAYMENT,
  })
  checkStatus?: CreditCheckStatus;

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
  createdAt?: Date;

  // relations
  @OneToMany(
    () => CreditCheckFile,
    (creditCheckAttachment) => creditCheckAttachment.creditCheck,
  )
  creditCheckFiles?: CreditCheckFile[];

  @OneToMany(
    () => CreditCheckHistory,
    (creditCheckHistory) => creditCheckHistory.creditCheck,
  )
  creditCheckHistories?: CreditCheckHistory[];

  @ManyToOne(() => Company, (company) => company.creditChecks)
  @JoinColumn([{ name: 'company_id', referencedColumnName: 'id' }])
  company: Company;
}
