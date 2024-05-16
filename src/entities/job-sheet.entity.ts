import { ManyToOne, Entity, PrimaryGeneratedColumn, Column, JoinColumn, OneToMany, OneToOne } from 'typeorm'
import { User } from './user.entity';
import { JobSheetItemType } from '../enums/enum';
import { Company } from './company.entity';
import { Quotation } from './quotation.entity';
import { JobSheetPayable } from './job-sheet-payable.entity';
import { Customer } from './customer.entity';
import { Invoice } from './invoice.entity';
import { JobSheetShipment } from './job-sheet-shipment.entity';

@Entity({ name: 't_job_sheets' })
export class JobSheet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'job_sheet_number',
    unique: true,
  })
  jobSheetNumber: string;

  @Column({
    name: 'rfq_number',
    nullable: true,
  })
  rfqNumber: string;

  @Column({
    name: 'customer_id',
  })
  customerId: string;

  @Column({
    name: 'item_type',
    type: 'enum',
    enum: JobSheetItemType,
    default: JobSheetItemType.AR,
  })
  itemType: string;

  @Column({
    name: 'ap_status',
    type: 'json',
    nullable: true,
  })
  apStatus: any;

  @Column({
    name: 'ar_status',
    type: 'json',
    nullable: true,
  })
  arStatus: any;
  
  @Column({
    default: 1,
  })
  status: number;

  @Column({
    name: 'company_id',
  })
  companyId: number;

  @Column({
    name: 'affiliation',
  })
  affiliation: string;

  @Column({
    name: 'created_by_user_id',
  })
  createdByUserId: number;

  @Column({
    name: 'ap_exchange_rate',
    type: 'json',
    nullable: true,
  })
  apExchangeRate: any;

  @Column({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @Column({
    name: 'updated_at',
    type: 'datetime',
    onUpdate: 'CURRENT_TIMESTAMP',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @Column({
    name: 'created_from_feature',
  })
  createdFromFeature : number;

  // Relations // TODO: fix relation with rfqNumber

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @OneToOne(() => Quotation)
  @JoinColumn([{ name: 'rfq_number', referencedColumnName: 'rfqNumber' }])
  quotation: Quotation;

  @ManyToOne(() => User, (user) => user.quotations)
  @JoinColumn([{ name: 'created_by_user_id', referencedColumnName: 'userId' }])
  user: User;

  @OneToMany(() => JobSheetPayable, (jobSheetPayable) => jobSheetPayable.jobSheet)
  payables: JobSheetPayable[];

  @ManyToOne(() => Customer, (customer) => customer.jobSheets)
  @JoinColumn([{ name: 'customer_id', referencedColumnName: 'customerId' }])
  customer: Customer;

  @OneToMany(() => Invoice, (invoice) => invoice.jobSheet)
  receivables: Invoice[];

  @OneToOne(() => JobSheetShipment, (jobSheetShipment) => jobSheetShipment.jobSheet)
  jobSheetShipment: JobSheetShipment;
}