import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, ManyToOne, OneToMany } from 'typeorm'
import { CustomerPosition, PackingList, ProductType, RfqStatus, RouteType, ShipmentService, ShipmentType, ShipmentVia } from 'src/enums/enum'
import { Bid } from 'src/entities/bid.entity';
import { Customer } from 'src/entities/customer.entity';
import { QuotationFile } from 'src/entities/quotation-file.entity';
import { Shipment } from 'src/entities/shipment.entity';
import { Invoice } from 'src/entities/invoice.entity';
import { ChatRoom } from './chat-room.entity';
import { QuotationExtendLog } from './quotation-extend-log.entity';
import { Company } from './company.entity';
import { QuotationNleCompany } from './quotation-nle-company.entity';
import { User } from './user.entity';
import { JobSheet } from './job-sheet.entity';
import { QuotationRevenueHistory } from './quotation-revenue-history.entity';

@Entity({ name: 't_quotations' })
export class Quotation {
  @PrimaryGeneratedColumn({
    name: 'id',
  })
  id: number;

  @Column({
    name: 'customer_id',
  })
  customerId: string;

  @Column({
    name: 'rfq_number',
    unique: true,
  })
  rfqNumber: string;

  // shipping section
  @Column({
    name: 'shipment_via',
    type: 'enum',
    enum: ShipmentVia,
    nullable: true,
  })
  shipmentVia: ShipmentVia;

  @Column({
    name: 'shipment_service',
    type: 'enum',
    enum: ShipmentService,
    nullable: true,
  })
  shipmentService: ShipmentService;

  @Column({
    name: 'country_from',
    nullable: true,
  })
  countryFrom: string;

  @Column({
    name: 'country_from_code',
    nullable: true,
  })
  countryFromCode: string;

  @Column({
    name: 'country_from_id',
    nullable: true,
  })
  countryFromId: number;

  @Column({
    name: 'city_from',
    nullable: true,
  })
  cityFrom: string;

  @Column({
    name: 'port_of_loading',
    nullable: true,
  })
  portOfLoading: string;

  // if shipmentService.includes('Door')
  @Column({
    name: 'address_from',
    length: 500,
    nullable: true,
  })
  addressFrom: string;

  // if shipmentService.includes('Door')
  @Column({
    name: 'zipcode_from',
    length: 10,
    nullable: true,
  })
  zipcodeFrom: string;

  @Column({
    name: 'country_to',
    nullable: true,
  })
  countryTo: string;

  @Column({
    name: 'country_to_code',
    nullable: true,
  })
  countryToCode: string;

  @Column({
    name: 'country_to_id',
    nullable: true,
  })
  countryToId: number;

  @Column({
    name: 'city_to',
    nullable: true,
  })
  cityTo: string;

  @Column({
    name: 'port_of_discharge',
    nullable: true,
  })
  portOfDischarge: string;

  // if shipmentService.includes('Door')
  @Column({
    name: 'address_to',
    length: 500,
    nullable: true,
  })
  addressTo: string;

  // if shipmentService.includes('Door')
  @Column({
    name: 'zipcode_to',
    length: 10,
    nullable: true,
  })
  zipcodeTo: string;

  @Column({
    name: 'customer_position',
    type: 'enum',
    enum: CustomerPosition,
    nullable: true,
  })
  customerPosition: CustomerPosition;

  @Column({
    name: 'route_type',
    type: 'enum',
    enum: RouteType,
    nullable: true,
  })
  routeType: RouteType;

  @Column({
    name: 'shipment_date',
    nullable: true,
  })
  shipmentDate: string;

  // shipment type section
  @Column({
    name: 'shipment_type',
    type: 'enum',
    enum: ShipmentType,
    nullable: true,
  })
  shipmentType: ShipmentType;

  @Column({
    name: 'packing_list',
    type: 'json',
    nullable: true,
  })
  packingList: PackingList[];

  @Column({
    name: 'total_qty',
    nullable: true,
  })
  totalQty: number;

  @Column({
    name: 'estimated_total_weight',
    type: 'decimal',
    precision: 16,
    scale: 2,
    nullable: true,
  })
  estimatedTotalWeight: number;

  @Column({
    type: 'bigint',
    nullable: true,
  })
  volumetric: number;

  @Column({
    name: 'volumetric_unit',
    nullable: true,
  })
  volumetricUnit: string;

  // product type section
  @Column({
    name: 'product_type',
    type: 'enum',
    enum: ProductType,
    nullable: true,
  })
  productType: ProductType;

  @Column({
    name: 'kind_of_goods',
    nullable: true,
  })
  kindOfGoods: string;

  @Column({
    name: 'value_of_goods',
    nullable: true,
  })
  valueOfGoods: number;

  @Column({
    // currency for value of goods
    name: 'currency',
    default: null,
  })
  currency: string;

  @Column({
    name: 'hs_code',
    nullable: true,
  })
  hsCode: string;

  @Column({
    name: 'po_number',
    nullable: true,
  })
  poNumber: string;

  // if productType == 'Dangerous
  @Column({
    name: 'un_number',
    nullable: true,
  })
  unNumber: string;

  @Column({
    length: 500,
    nullable: true,
  })
  description: string;

  // additional section
  @Column({
    length: 500,
    nullable: true,
  })
  remark: string;

  @Column({
    name: 'origin_customs_clearance',
    type: 'boolean',
    default: false,
  })
  originCustomsClearance: boolean;

  @Column({
    name: 'destination_customs_clearance',
    type: 'boolean',
    default: false,
  })
  destinationCustomsClearance: boolean;

  @Column({
    name: 'warehouse_storage',
    type: 'boolean',
    default: false,
  })
  warehouseStorage: boolean;

  @Column({
    name: 'rfq_status',
    type: 'enum',
    enum: RfqStatus,
    default: RfqStatus.DRAFT,
  })
  rfqStatus: RfqStatus;

  // shipper
  @Column({
    name: 'shipper_name',
    nullable: true,
  })
  shipperName: string;

  @Column({
    name: 'shipper_company',
    nullable: true,
  })
  shipperCompany: string;

  @Column({
    name: 'shipper_phone_code',
    nullable: true,
  })
  shipperPhoneCode: string;

  @Column({
    name: 'shipper_phone',
    nullable: true,
  })
  shipperPhone: string;

  @Column({
    name: 'shipper_tax_id',
    nullable: true,
  })
  shipperTaxId: string;

  @Column({
    name: 'shipper_email',
    nullable: true,
  })
  shipperEmail: string;

  @Column({
    name: 'shipper_zip_code',
    nullable: true,
  })
  shipperZipCode: string;

  @Column({
    name: 'shipper_address',
    length: 500,
    nullable: true,
  })
  shipperAddress: string;

  // consignee
  @Column({
    name: 'consignee_name',
    nullable: true,
  })
  consigneeName: string;

  @Column({
    name: 'consignee_company',
    nullable: true,
  })
  consigneeCompany: string;

  @Column({
    name: 'consignee_phone_code',
    nullable: true,
  })
  consigneePhoneCode: string;

  @Column({
    name: 'consignee_phone',
    nullable: true,
  })
  consigneePhone: string;

  @Column({
    name: 'consignee_tax_id',
    nullable: true,
  })
  consigneeTaxId: string;

  @Column({
    name: 'consignee_email',
    nullable: true,
  })
  consigneeEmail: string;

  @Column({
    name: 'consignee_zip_code',
    nullable: true,
  })
  consigneeZipCode: string;

  @Column({
    name: 'consignee_address',
    length: 500,
    nullable: true,
  })
  consigneeAddress: string;

  @Column({
    name: 'valid_until',
    length: 10,
    nullable: true,
  })
  validUntil: string;

  // rfq expired from customer
  @Column({
    name: 'rfq_expired',
    length: 10,
    nullable: true,
  })
  rfqExpired: string;

  // NOTE: if failed by customer, it must be the owner of this quotaion
  // refer to this.customerId, this column must be null
  // also refer to this.rfqStatus to know if this quotation rejected or cancelled
  @Column({
    name: 'failed_by_company_id',
    nullable: true,
  })
  failedByCompanyId: number;

  @Column({
    default: 1,
  })
  status: number;

  @Column({
    name: 'limit_wa_ff',
    default: 2,
    nullable: true,
  })
  limitWaFF: number;

  @Column({
    name: 'limit_wa_customer',
    default: 1,
    nullable: true,
  })
  limitWaCustomer: number;

  @Column({
    name: 'affiliation',
    nullable: true,
  })
  affiliation: string;

  @Column({
    name: 'revenue_note',
    nullable: true,
  })
  revenueNote: string;

  // companyId of FF who owns this
  // if rfqStatus !== COMPLETED, this column is null
  @Column({
    name: 'company_id',
    nullable: true,
  })
  companyId: number;

  // NOTE: if created by customer, it must be the owner of this quotaion
  // refer to this.customerId, this column must be null
  @Column({
    name: 'created_by_company_id',
    nullable: true,
  })
  createdByCompanyId: number;

  @Column({
    name: 'created_by_user_id',
  })
  createdByUserId: number;

  @Column({
    name: 'updated_by_user_id',
    nullable: true,
  })
  updatedByUserId: number;

  @Column({
    name: 'accepted_by_user_id',
    nullable: true,
  })
  acceptedByUserId: number;

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
    name: 'show_subtotal',
    type: 'boolean',
    default: true,
  })
  showSubtotal: boolean;

  // Relation
  @OneToMany(() => Bid, (bid) => bid.quotation)
  bids: Bid[];

  @ManyToOne(() => Customer, (customer) => customer.quotations)
  @JoinColumn([{ name: 'customer_id', referencedColumnName: 'customerId' }])
  customer: Customer;

  @OneToMany(() => QuotationFile, (quotationFile) => quotationFile.quotation)
  quotationFiles: QuotationFile[];

  @OneToOne(() => Shipment, (shipment) => shipment.quotation)
  shipment: Shipment;

  @OneToMany(() => Invoice, (invoice) => invoice.quotation)
  invoices: Invoice[];

  @OneToMany(
    () => QuotationExtendLog,
    (quotationExtendLog) => quotationExtendLog.quotation,
  )
  extendLogs: QuotationExtendLog[];

  @OneToOne(() => ChatRoom, (chatRoom) => chatRoom.quotation)
  chatRoom: ChatRoom;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @OneToMany(
    () => QuotationNleCompany,
    (quotationNle) => quotationNle.quotation,
  )
  quotationNleCompany: QuotationNleCompany[];

  @ManyToOne(() => User, (user) => user.quotations)
  @JoinColumn([{ name: 'created_by_user_id', referencedColumnName: 'userId' }])
  user: User;

  @OneToOne(() => JobSheet)
  @JoinColumn([{ name: 'rfq_number', referencedColumnName: 'rfqNumber' }])
  jobSheet: JobSheet;

  @OneToMany(() => QuotationRevenueHistory, (quotationRevenueHistory) => quotationRevenueHistory.quotation)
  quotationRevenueHistories: QuotationRevenueHistory[];
}
