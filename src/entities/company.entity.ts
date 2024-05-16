import { User } from 'src/entities/user.entity';
import { PaymentAdvice } from 'src/entities/payment-advice.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  JoinTable,
  ManyToMany,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { Customer } from 'src/entities/customer.entity';
import { Menu } from 'src/entities/menu.entity';
import { ChatRoom } from './chat-room.entity';
import { ChatCustomer } from './chat-customer.entity';
import { OriginDestination } from './origin-destination.entity';
import { Country } from './country.entity';
import { Port } from './port.entity';
import { PriceComponent } from './price-component.entity';
import { SubscriptionHistory } from './subscription-history.entity';
import { BlHistory } from './bl-history.entity';
import { HblFieldType } from './types';
import { ThirdParty } from './third-party.entity';
import { JobSheet } from './job-sheet.entity';
import { Features } from './features.entity';
import { OcrDocument } from './ocr-document.entity';
import { HblDynamicHistory } from './hbl-dynamic-history.entity';
import { CreditCheck } from './credit-check.entity';

@Entity({ name: 'c_companies' })
export class Company {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    unique: true,
  })
  name: string;

  @Column({
    nullable: true,
    length: 500,
  })
  address: string;

  @Column({
    nullable: true,
  })
  email: string;

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
    nullable: true,
    width: 20,
  })
  npwp: string;

  @Column({
    name: 'file_container',
    nullable: true,
  })
  fileContainer: string;

  @Column({
    nullable: true,
  })
  logo: string;

  @Column({
    name: 'theme_color',
    nullable: true,
  })
  themeColor: string;

  @Column({
    name: 'quotation_notes',
    type: 'text',
    nullable: true,
    default: null,
  })
  quotationNotes: string;

  @Column({
    name: 'quotation_remark',
    type: 'text',
    nullable: true,
    default: null,
  })
  quotationRemark: string;

  @Column({
    name: 'invoice_remark',
    type: 'text',
    nullable: true,
    default: null,
  })
  invoiceRemark: string;

  @Column({
    name: 'price_detail_remark',
    type: 'text',
    nullable: true,
    default: null,
  })
  priceDetailRemark: string;

  @Column({
    nullable: true,
  })
  affiliation: string;

  @Column({
    nullable: true,
    unique: true,
  })
  subdomain: string;

  @Column({
    name: 'customer_subdomain',
    length: 100,
    nullable: true,
    unique: true,
  })
  customerSubdomain: string;

  @Column({
    name: 'customer_module',
    type: 'boolean',
    default: false,
  })
  customerModule: boolean;

  @Column({
    name: 'shipment_quota',
    default: 0,
  })
  shipmentQuota: number;

  @Column({
    name: 'shipment_quota_unlimited',
    type: 'boolean',
    default: false,
  })
  shipmentQuotaUnlimited: number;

  @Column({
    name: 'activation_code',
    nullable: true,
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
    name: 'bl_terms',
    type: 'text',
    nullable: true,
  })
  blTerms: string;

  @Column({
    name: 'hbl_template',
    type: 'json',
    nullable: true,
    default: [],
  })
  hblTemplate: Array<{
    id: number;
    originalName: string;
    fileName: string;
    status: 'PROGRESS' | 'REJECTED' | 'DONE';
    requestedAt: Date;
  }> = [];

  @Column({
    name: 'hbl_field',
    type: 'json',
    nullable: true,
  })
  hblField: HblFieldType;

  @Column({
    name: 'hbl_approved_template',
    nullable: true,
  })
  hblApprovedTemplate: string;

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
    name: 'is_trial',
    type: 'boolean',
    default: false,
  })
  isTrial: boolean;

  @Column({
    name: 'pic_name',
    nullable: true,
  })
  picName: string;

  @Column({
    name: 'trial_limit',
    type: 'json',
  })
  trialLimit: any;

  @Column({
    name: 'features',
    type: 'json',
  })
  features: any;

  @Column({
    name: 'hbl_dynamic',
    type: 'json',
    nullable: true,
  })
  hblDynamic: any;

  // Relations
  @OneToMany(() => User, (user) => user.company)
  users: User[];

  @OneToMany(() => PaymentAdvice, (paymentAdvice) => paymentAdvice.company)
  paymentAdvices: PaymentAdvice[];

  @OneToMany(() => Customer, (customer) => customer.companyId)
  customers: Customer[];

  @OneToMany(() => Country, (country) => country.company)
  countries: Country[];

  @OneToMany(
    () => OriginDestination,
    (originDestination) => originDestination.company,
  )
  originDestinations: OriginDestination[];

  @OneToMany(() => Port, (port) => port.company)
  ports: Port[];

  @OneToMany(() => PriceComponent, (priceComponent) => priceComponent.company)
  priceComponents: PriceComponent[];

  @OneToMany(() => ChatCustomer, (chatCustomer) => chatCustomer.company)
  chatCustomers: ChatCustomer[];

  @OneToMany(() => ChatRoom, (chatRoom) => chatRoom.company)
  chatRooms: ChatRoom[];

  @OneToMany(() => BlHistory, (blHistory) => blHistory.company)
  blHistory: BlHistory[];

  @OneToMany(() => CreditCheck, (creditCheck) => creditCheck.company)
  creditChecks: CreditCheck[];

  @ManyToMany(() => Menu)
  @JoinTable({
    name: 'm_access_menu_companies',
    joinColumn: {
      name: 'company_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'menu_id',
      referencedColumnName: 'id',
    },
  })
  menus: Menu[];

  @OneToMany(
    () => SubscriptionHistory,
    (subscriptionHistory) => subscriptionHistory.company,
  )
  subscriptionHistories: SubscriptionHistory[];

  @OneToMany(() => ThirdParty, (thirdParty) => thirdParty.company)
  thirdParties: ThirdParty[];

  @OneToMany(() => JobSheet, (jobSheet) => jobSheet.company)
  jobSheets: JobSheet[];

  @OneToMany(() => OcrDocument, (ocrDocument) => ocrDocument.company)
  ocrDocument: OcrDocument[];
  @OneToMany(() => HblDynamicHistory, (hblDynamicHistory) => hblDynamicHistory.company)
  hblDynamicCompanyHistories: HblDynamicHistory[];
}
