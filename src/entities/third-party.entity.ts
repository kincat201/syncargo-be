import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  UpdateDateColumn,
} from 'typeorm';

import { Company } from './company.entity';
import { Invoice } from './invoice.entity';
import { InvoiceHistory } from './invoice-history.entity';

@Entity({ name: 'm_third_parties' })
export class ThirdParty {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'created_by_user_id',
    nullable: false,
  })
  createdByUserId: number;

  @Column({ name: 'pic_name', nullable: false })
  picName: string;

  @Column({ name: 'company_name', nullable: false })
  companyName: string;

  @Column({ name: 'currency', nullable: false })
  currency: string;

  @Column({ name: 'type_of_payment', nullable: false })
  typeOfPayment: string;

  @Column({ name: 'phone_code', nullable: false })
  phoneCode: string;

  @Column({ name: 'phone_number', nullable: false })
  phoneNumber: string;

  @Column({ name: 'email', nullable: true })
  email?: string;

  @Column({ name: 'business_license', nullable: true })
  businessLicense?: string;

  @Column({ name: 'type', nullable: true })
  type?: string;

  @Column({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt?: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt?: Date;

  @Column({ name: 'status', nullable: false, default: true })
  status?: boolean;

  @Column({ name: 'address', nullable: true })
  address?: string;

  @ManyToOne(() => Company, (company) => company.thirdParties)
  @JoinColumn({ name: 'company_id', referencedColumnName: 'id' })
  company: Company;

  @OneToMany(() => Invoice, (invoice) => invoice.thirdParties)
  @JoinColumn({ name: 'third_party_id', referencedColumnName: 'id' })
  invoices?: Invoice[];
  
  @OneToMany(() => InvoiceHistory, (invoiceHistory) => invoiceHistory.thirdParties)
  @JoinColumn({ name: 'third_party_id', referencedColumnName: 'id'})
  invoiceHistories?: Invoice[];
}
