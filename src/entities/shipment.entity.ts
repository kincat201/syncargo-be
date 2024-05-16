import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import {
  OtifStatus,
  ShipmentService,
  ShipmentStatus,
  BlTemplateType,
} from 'src/enums/enum';
import { Quotation } from 'src/entities/quotation.entity';
import { Customer } from 'src/entities/customer.entity';
import { ShipmentOtif } from 'src/entities/shipment-otif.entity';
import { ShipmentFile } from 'src/entities/shipment-file.entity';
import { Invoice } from 'src/entities/invoice.entity';
import { ShipmentSelllingPrice } from 'src/entities/shipment-selling-price.entity';
import { ShipmentDelay } from './shipment-delay.entity';
import { ShipmentDelayFile } from './shipment-delay-file.entity';
import { Country } from 'src/entities/country.entity';
import { Company } from 'src/entities/company.entity';
import { OriginDestination } from 'src/entities/origin-destination.entity';
import { HblDynamicHistory } from './hbl-dynamic-history.entity';

@Entity({ name: 't_shipments' })
export class Shipment {
  @PrimaryGeneratedColumn({
    name: 'id',
  })
  id: number;

  @Column({
    name: 'rfq_number',
    unique: true,
  })
  rfqNumber: string;

  @Column({
    name: 'customer_id',
  })
  customerId: string;

  @Column({
    name: 'shipment_status',
    type: 'enum',
    enum: ShipmentStatus,
    default: ShipmentStatus.WAITING,
  })
  shipmentStatus: ShipmentStatus;

  @Column({
    name: 'otif_status',
    type: 'enum',
    enum: OtifStatus,
    default: OtifStatus.BOOKED,
  })
  otifStatus: OtifStatus;

  @Column({
    name: 'shipment_service',
    type: 'enum',
    enum: ShipmentService,
  })
  shipmentService: ShipmentService;

  // carrier information
  @Column({
    name: 'shipping_line',
  })
  shippingLine: string;

  @Column()
  vendor: string;

  @Column({
    name: 'master_bl',
    nullable: true,
  })
  masterBl: string;

  @Column({
    name: 'master_bl_type',
    nullable: true,
  })
  masterBlType: string;

  @Column({
    name: 'house_bl',
    nullable: true,
  })
  houseBl: string;

  @Column({
    name: 'house_bl_type',
    nullable: true,
  })
  houseBlType: string;

  @Column({
    nullable: true,
  })
  terms: string;

  @Column({
    default: 1,
  })
  status: number;

  @Column({
    name: 'default_ppn',
    type: 'boolean',
    default: false,
  })
  defaultPpn: boolean;

  @Column({
    name: 'ppn',
    default: 0,
  })
  ppn: number;

  @Column({
    length: 8,
    default: 'IDR',
  })
  currency: string;

  @Column({
    name: 'exchange_rate',
    type: 'decimal',
    precision: 16,
    scale: 2,
    default: 1,
  })
  exchangeRate: number;

  @Column({
    name: 'shipment_selling_price_ppn',
    default: 0,
  })
  shipmentSellingPricePpn: number; // TODO: remove

  @Column({
    name: 'container_number',
    type: 'json',
  })
  containerNumber: [];

  @Column({
    name: 'voyage_name',
    type: 'varchar',
  })
  voyageName: string;

  @Column({
    name: 'voyage_number',
    type: 'varchar',
  })
  voyageNumber: string;

  @Column({
    name: 'bl_freight_amount',
    type: 'int',
  })
  blFreightAmount: number;

  @Column({
    name: 'bl_freight_payable',
    type: 'varchar',
  })
  blFreightPayable: string;

  @Column({
    name: 'bl_insurance',
    type: 'varchar',
  })
  blInsurance: string;

  @Column({
    name: 'bl_country_id',
    type: 'int',
  })
  blCountryId: number;

  @Column({
    name: 'bl_city_id',
    type: 'int',
  })
  blCityId: number;

  @Column({
    name: 'bl_terms',
    type: 'text',
  })
  blTerms: string;

  @Column({
    name: 'bl_prepaid_type',
    type: 'varchar',
  })
  blPrepaidType: string;

  @Column({
    name: 'bl_collect_type',
    type: 'varchar',
  })
  blCollectType: string;

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
    name: 'house_bl_file',
    nullable: true,
  })
  houseBlFile: string;

  @Column({
    name: 'bl_house_bl_file',
    nullable: true,
  })
  customHouseBlFile: string;

  @Column({
    name: 'master_bl_file',
  })
  masterBlFile: string;

  @Column({
    name: 'bl_template_type',
    enum: BlTemplateType,
    nullable: true,
  })
  blTemplateType: BlTemplateType;

  @Column({
    name: 'bl_history',
    type: 'json',
  })
  blHistory: Array<{
    dateTime: Date;
    blType: string;
    activity: string;
    updatedBy: string;
  }>;

  // Custom ADDA HBL
  @Column({
    name: 'bl_document_type',
    nullable: true,
  })
  blDocumentType: string;

  @Column({
    name: 'bl_booking_number',
    nullable: true,
  })
  blBookingNumber: string;

  @Column({
    name: 'bl_references',
    nullable: true,
  })
  blReferences: string;

  @Column({
    name: 'bl_export_references',
    nullable: true,
  })
  blExportReferences: string;

  @Column({
    name: 'bl_shipper_address',
    nullable: true,
  })
  blShipperAddress: string;

  @Column({
    name: 'bl_consignee_address',
    nullable: true,
  })
  blConsigneeAddress: string;

  @Column({
    name: 'bl_notify_party_address',
    nullable: true,
  })
  blNotifyPartyAddress: string;

  @Column({
    name: 'bl_delivery_agent',
    nullable: true,
  })
  blDeliveryAgent: string;

  @Column({
    name: 'bl_export_vessel',
    nullable: true,
  })
  blExportVessel: string;

  @Column({
    name: 'bl_place_of_receipt',
    nullable: true,
  })
  blPlaceOfReceipt: string;
  
  @Column({
    name: 'bl_place_of_delivery',
    nullable: true,
  })
  blPlaceOfDelivery: string;

  @Column({
    name: 'bl_mark_and_number',
    nullable: true,
  })
  blMarkAndNumber: string;

  @Column({
    name: 'bl_desc_of_goods',
    nullable: true,
  })
  blDescOfGoods: string;

  @Column({
    name: 'bl_number_of_bl',
    nullable: true,
  })
  blNumberOfBl: string;

  @Column({
    name: 'bl_as_agent_for',
    nullable: true,
  })
  blAsAgentFor: string;

  @Column({
    name: 'bl_receipt_date',
    nullable: true,
  })
  blReceiptDate: string;

  @Column({
    name: 'bl_desc_of_rates_and_charges',
    nullable: true,
  })
  blDescOfRatesAndCharges: string;

  @Column({
    name: 'bl_number_of_packages',
    nullable: true,
  })
  blNumberOfPackages: string;

  @Column({
    name: 'bl_packages_unit',
    nullable: true,
  })
  blPackagesUnit: string;

  @Column({
    name: 'bl_gross_weight',
    nullable: true,
  })
  blGrossWeight: string;

  @Column({
    name: 'bl_weight_unit',
    nullable: true,
  })
  blWeightUnit: string;

  @Column({
    name: 'bl_volumetric',
    nullable: true,
  })
  blVolumetric: string;

  @Column({
    name: 'bl_volumetric_unit',
    nullable: true,
  })
  blVolumetricUnit: string;

  @Column({
    name: 'is_ceisa',
    type: 'boolean',
    default: false,
  })
  isCeisa: boolean;

  @Column({
    name: 'ceisa_field',
    type: 'json',
    nullable: true,
  })
  ceisaField: any;

  @Column({
    name: 'hbl_dynamic',
    type: 'json',
    nullable: true,
  })
  hblDynamic: any;

  @Column({
    name: 'hbl_dynamic_default',
    type: 'boolean',
    default: true,
  })
  hblDynamicDefault: boolean;

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
    name: 'label'
  })
  label: string;

  // Relation
  @OneToOne(() => Quotation)
  @JoinColumn([{ name: 'rfq_number', referencedColumnName: 'rfqNumber' }])
  quotation: Quotation;

  @ManyToOne(() => Customer, (customer) => customer.quotations)
  @JoinColumn([{ name: 'customer_id', referencedColumnName: 'customerId' }])
  customer: Customer;

  @OneToMany(() => ShipmentOtif, (shipmentOtif) => shipmentOtif.shipment)
  shipmentOtifs: ShipmentOtif[];

  @OneToMany(() => ShipmentFile, (shipmentFile) => shipmentFile.shipment)
  shipmentFiles: ShipmentFile[];

  @OneToMany(() => Invoice, (invoice) => invoice.shipment)
  invoices: Invoice[];

  @OneToMany(
    () => ShipmentSelllingPrice,
    (shipmentSelllingPrice) => shipmentSelllingPrice.shipment,
  )
  shipmentSellingPrice: ShipmentSelllingPrice[];

  @OneToMany(() => ShipmentDelay, (shipmentDelay) => shipmentDelay.shipment)
  shipmentDelays: ShipmentDelay[];

  @OneToMany(
    () => ShipmentDelayFile,
    (shipmentDelayFile) => shipmentDelayFile.shipment,
  )
  shipmentDelayFiles: ShipmentDelayFile[];

  @ManyToOne(() => Country)
  @JoinColumn({ name: 'bl_country_id' })
  blCountry: Country;

  @ManyToOne(() => OriginDestination)
  @JoinColumn({ name: 'bl_city_id' })
  blCity: OriginDestination;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'created_by_company_id' })
  company: Company;

  @OneToMany(() => HblDynamicHistory, (hblDynamicHistory) => hblDynamicHistory.shipment)
  hblDynamicShipmentHistories: HblDynamicHistory[];
}
