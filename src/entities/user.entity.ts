import { Company } from 'src/entities/company.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
  ManyToMany,
  JoinTable,
  OneToMany,
  OneToOne,
  BeforeUpdate,
} from 'typeorm';
import * as bcrypt from 'bcrypt'
import { Menu } from 'src/entities/menu.entity';
import { Role } from 'src/enums/enum'
import { Invoice } from './invoice.entity';
import { Customer } from './customer.entity';
import { ShipmentHistory } from './shipment-history.entity';
import { Quotation } from './quotation.entity';
import { JobSheetPayableHistory } from './job-sheet-payable-history.entity';
import { InvoiceHistory } from './invoice-history.entity';
import { JobSheetReceivableHistory } from './job-sheet-receivable-history.entity';
import { OcrDocumentHistory } from './ocr-document-history.entity';
import { HblDynamicHistory } from './hbl-dynamic-history.entity';
import { CreditCheckHistory } from './credit-check-history.entity';

@Entity({ name: 'c_users' })
export class User {
  @PrimaryGeneratedColumn({
    name: 'id',
  })
  userId: number;

  @Column({
    name: 'company_id',
  })
  companyId: number;

  @Column({
    name: 'customer_id',
    length: 12,
    nullable: true,
  })
  customerId: string;

  @Column({
    name: 'full_name',
  })
  fullName: string;

  @Column()
  email: string;

  @Column({
    nullable: true,
  })
  password: string;

  @Column({
    name: 'phone_code',
    nullable: true,
  })
  phoneCode: string;

  @Column({
    name: 'phone_number',
    nullable: true,
  })
  phoneNumber: string;

  @Column({
    type: 'enum',
    enum: Role,
  })
  role: string;

  @Column({
    name: 'file_container',
    nullable: true,
  })
  fileContainer: string;

  @Column({
    nullable: true,
  })
  photo: string;

  @Column({
    nullable: true,
  })
  affiliation: string;

  @Column({
    name: 'division_name',
    nullable: true,
  })
  divisionName: string;

  @Column({
    name: 'last_login',
    nullable: true,
    type: 'datetime',
  })
  lastLogin: Date;

  @Column({
    name: 'customer_login',
    nullable: true,
  })
  customerLogin: boolean;

  @Column({
    name: 'customer_subdomain',
    nullable: true,
  })
  customerSubdomain: string;

  @Column({
    name: 'user_status',
    default: 'OPEN',
  })
  userStatus: string;

  @Column({
    name: 'created_by',
    nullable: true,
  })
  createdBy: string;

  @Column({
    default: 1,
  })
  status: number;

  @Column({
    name: 'revenue_target',
    type: 'decimal',
    precision: 16,
    scale: 2,
    default: 0,
  })
  revenueTarget: number;

  @Column({
    name: 'created_by_user_id',
    nullable: true,
  })
  createdByUserId: number;

  @Column({
    name: 'updated_by_user_id',
    nullable: true,
  })
  updatedByUserId: number;

  @Column({
    name: 'deleted_by_user_id',
    nullable: true,
  })
  deletedByUserId: number;

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
    name: 'deleted_at',
    type: 'datetime',
    nullable: true,
  })
  deletedAt: Date;

  @OneToMany(() => Invoice, (invoice) => invoice.creatorInvoice)
  createdInvoices: Invoice[];

  @ManyToOne(() => Company, (company) => company.users)
  @JoinColumn([{ name: 'company_id', referencedColumnName: 'id' }])
  company: Company;

  @ManyToMany(() => Menu)
  @JoinTable({
    name: 'm_access_menu_users',
    joinColumn: {
      name: 'user_id',
      referencedColumnName: 'userId',
    },
    inverseJoinColumn: {
      name: 'menu_id',
      referencedColumnName: 'id',
    },
  })
  menus: Menu[];

  @OneToOne(() => Customer, (customer) => customer.user)
  @JoinColumn([{ name: 'customer_id', referencedColumnName: 'customerId' }])
  customer: Customer;

  @OneToMany(() => Quotation, (quotation) => quotation.customer)
  quotations: Quotation[];

  @OneToMany(
    () => ShipmentHistory,
    (shipmentHistory) => shipmentHistory.creator,
  )
  shipmentHistory: ShipmentHistory[];

  @OneToMany(
    () => JobSheetPayableHistory,
    (jobSheetPayableHistory) => jobSheetPayableHistory.creator,
  )
  jobSheetPayableHistory: JobSheetPayableHistory[];

  @OneToMany(
    () => JobSheetReceivableHistory,
    (jobSheetReceivableHistory) => jobSheetReceivableHistory.creator,
  )
  jobSheetReceivableHistory: JobSheetReceivableHistory[];

  @OneToMany(
    () => InvoiceHistory,
    (invoiceHistory) => invoiceHistory.creator,
  )
  invoiceHistory: InvoiceHistory[];

  @OneToMany(
    () => InvoiceHistory,
    (approvalInvoiceHistory) => approvalInvoiceHistory.approvedBy,
  )
  approvalInvoiceHistory: InvoiceHistory[];

  @OneToMany(
    () => OcrDocumentHistory,
    (ocrDocumentHistory) => ocrDocumentHistory.createdBy,
  )
  ocrDocumentHistory: OcrDocumentHistory[];  
  
  @OneToMany(
    () => HblDynamicHistory,
    (hblDynamicHistory) => hblDynamicHistory.creator,
  )
  hblDynamicHistories: HblDynamicHistory[];

  @OneToMany(
    () => CreditCheckHistory,
    (creditCheckHistory) => creditCheckHistory.createdBy,
  )
  creditCheckHistories: CreditCheckHistory[];

  // Hooks
  @BeforeInsert()
  async hashPassword() {
    if (this.password) {
      this.password = bcrypt.hashSync(this.password, 10);
    }
  }
}
