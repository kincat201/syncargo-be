import { Company } from 'src/entities/company.entity';
import { Invoice } from 'src/entities/invoice.entity';
import { Quotation } from 'src/entities/quotation.entity';
import { Shipment } from 'src/entities/shipment.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  OneToOne, ManyToMany, JoinTable,
} from 'typeorm';
import { ChatCustomer } from './chat-customer.entity';
import { ChatRoom } from './chat-room.entity';
import { User } from './user.entity';
import { CustomerNle } from './customer-nle.entity';
import { NotificationSetting } from './notification-setting.entity';
import { JobSheet } from './job-sheet.entity';
import { InvoiceHistory } from './invoice-history.entity';

@Entity({ name: 'c_customers' })
export class Customer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'company_name',
  })
  companyName: string;

  @Column({
    name: 'full_name',
  })
  fullName: string;

  @Column()
  email: string;

  @Column({
    name: 'phone_code',
  })
  phoneCode: string;

  @Column({
    name: 'phone_number',
  })
  phoneNumber: string;

  @Column({
    name: 'customer_id',
    unique: true,
    nullable: true,
  })
  customerId: string;

  @Column({
    name: 'customer_type',
    nullable: true,
  })
  customerType: string;

  @Column({
    nullable: true,
    width: 20,
  })
  npwp: string;

  @Column({
    nullable: true,
    length: 500,
  })
  address: string;

  @Column({
    name: 'company_id',
  })
  companyId: number;
  
  @Column({
    name: 'affiliation',
    nullable: true
  })
  userAffiliation: string;

  @Column({
    name: 'type_of_payment',
  })
  typeOfPayment: string;

  @Column({
    name: 'activation_code',
  })
  activationCode: string;

  @Column({
    default: 1,
  })
  status: number;

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

  // Relation
  @OneToMany(() => Quotation, (quotation) => quotation.customer)
  quotations: Quotation[];

  @OneToMany(() => Shipment, (shipment) => shipment.customer)
  shipments: Shipment[];

  @ManyToOne(() => Company, (company) => company.customers)
  @JoinColumn([{ name: 'company_id', referencedColumnName: 'id' }])
  company: Company;

  @OneToMany(() => Invoice, (invoice) => invoice.customer)
  invoices: Invoice[];

  @OneToMany(() => ChatCustomer, (chatCustomer) => chatCustomer.customer)
  chatCustomers: ChatCustomer[];

  @OneToMany(() => ChatRoom, (chatRoom) => chatRoom.customer)
  chatRooms: ChatRoom[];

  @OneToOne(() => User, (user) => user.customer)
  user: User;

  @OneToMany(() => CustomerNle, (customerNle) => customerNle.customer)
  customerNle: CustomerNle[];

  @ManyToMany(() => NotificationSetting)
  @JoinTable({
    name: 'm_notification_setting_disabled_customers',
    joinColumn: {
      name: 'customer_id',
      referencedColumnName: 'customerId',
    },
    inverseJoinColumn: {
      name: 'notification_setting_id',
      referencedColumnName: 'id',
    },
  })
  notificationSettingDisabled: NotificationSetting[];

  @OneToMany(() => JobSheet, (jobSheet) => jobSheet.customer)
  jobSheets: JobSheet[];

  @OneToMany(() => InvoiceHistory, (invoiceHistory) => invoiceHistory.customer)
  invoiceHistories: InvoiceHistory[];

}
