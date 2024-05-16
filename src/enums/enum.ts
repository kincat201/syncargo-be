export enum OtifStatus {
  BOOKED = 'BOOKED',
  SCHEDULED = 'SCHEDULED',
  PICKUP = 'PICKUP',
  ORIGIN_LOCAL_HANDLING = 'ORIGIN_LOCAL_HANDLING',
  DEPARTURE = 'DEPARTURE',
  ARRIVAL = 'ARRIVAL',
  DESTINATION_LOCAL_HANDLING = 'DESTINATION_LOCAL_HANDLING',
  DELIVERY = 'DELIVERY',
  COMPLETE = 'COMPLETE',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum OngoingOtif {
  PICKUP = 'PICKUP',
  ORIGIN_LOCAL_HANDLING = 'ORIGIN_LOCAL_HANDLING',
  DEPARTURE = 'DEPARTURE',
  ARRIVAL = 'ARRIVAL',
  DESTINATION_LOCAL_HANDLING = 'DESTINATION_LOCAL_HANDLING',
  DELIVERY = 'DELIVERY',
}

export enum BlType {
  MBL = 'MBL',
  HBL = 'HBL',
}

export enum ShipmentStatus {
  WAITING = 'WAITING',
  ONGOING = 'ONGOING',
  COMPLETE = 'COMPLETE',
  FAILED = 'FAILED',
}

export enum BlTemplateType {
  DEFAULT = 'DEFAULT',
  CUSTOM = 'CUSTOM',
}

export enum BlStatusType {
  PROGRESS = 'PROGRESS',
  VALIDATION = 'VALIDATION',
  DONE = 'DONE',
  REJECTED = 'REJECTED',
}

export enum ShipmentVia {
  AIR = 'Air',
  OCEAN = 'Ocean',
}

export enum ShipmentService {
  DTD = 'Door to Door',
  DTP = 'Door to Port',
  PTD = 'Port to Door',
  PTP = 'Port to Port',
}

export enum ShipmentType {
  // AIR
  AIRBREAKBULK = 'AIRBREAKBULK',
  AIRCARGO = 'AIRCARGO',
  AIRCOURIER = 'AIRCOURIER',
  // SEA
  SEABREAKBULK = 'SEABREAKBULK',
  SEALCL = 'SEALCL',
  SEAFCL = 'SEAFCL',
}

export enum FclType {
  SEAFCL20FT = 'SEAFCL20FT',
  SEAFCL40FT = 'SEAFCL40FT',
  SEAFCL45FT = 'SEAFCL45FT',
  SEAFCL40FTHC = 'SEAFCL40FTHC',
  SEAFCL20FR = 'SEAFCL20FR',
  SEAFCL40FR = 'SEAFCL40FR',
  SEAFCL40HREF = 'SEAFCL40HREF',
  SEAFCL20RF = 'SEAFCL20RF',
}

// NOTE for Packaging Type
// peruntukan packaging type tiap shipment type lihat di tabel m_packaging_types

export enum PackagingType {
  BOX = 'Box',
  CARTON = 'Carton',
  CASE = 'Case',
  DRUM = 'Drum',
  PACKAGE = 'Package',
  PALLETE = 'Pallete',
  UNIT = 'Unit',
  CHARTER = 'Charter',
  CBM = 'CBM',
}

// NOTE for Packing List
/*
  AIR, SEA LCL    : [ { packagingType, packageQty, weight, (length, width, height )}, ... ]
  SEA BREAKBULK   : [ { packagingType, packageQty, weight, (length, width, height,) uom, qty  } ]
  SEA FCL         : [ { fclType, containerType, containerOption, weight, packagingType, qty, temperature }, ... ]
*/
// qty means container quantity
// packageQty means quantity for package
// SEA BREAKBULK len nya selalu 1

// this interface below used in entity not dto
// supaya bisa ke detect kalo itu berupa array
export interface PackingList {
  packageQty: number;
  packagingType: PackagingType;
  weight: number;
  length: number;
  width: number;
  height: number;
  qty: number;
  uom: UomSeaBreakbulk;
  fclType: FclType;
  containerOption: ContainerOption;
  containerType: ContainerType;
  temperature: number;
}

// khusus SEAFCL
export enum ContainerOption {
  SOC = "Shipper's Own Container (SOC)",
  COC = "Carrier's Own Container (COC)",
}

// khusus SEAFCL
export enum ContainerType {
  DRY = 'Dry',
  VENTILATE = 'Ventilate',
  REEFER = 'Reefer',
  OPEN_TOP = 'Open Top',
  ISO_TANK = 'ISO Tank',
  NOR = 'NOR',
}

// khusus SEABREAKBULK
export enum UomSeaBreakbulk {
  PER_UNIT = 'Per Unit',
  PER_TON = 'Per Ton',
  PER_CBM = 'Per CBM',
}

export enum ProductType {
  DANGEROUS = 'Dangerous',
  GENERAL = 'General',
  SPECIAL = 'Special',
}

export enum CustomerPosition {
  CONSIGNEE = 'Consignee',
  SHIPPER = 'Shipper',
}

export enum RouteType {
  EXPORT = 'Export',
  IMPORT = 'Import',
  DOMESTIC = 'Domestic',
}

export enum RfqStatus {
  DRAFT = 'DRAFT',
  WAITING = 'WAITING_FOR_QUOTATION',
  SUBMITTED = 'QUOTATION_SUBMITTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
}

export enum Uom {
  PER_CBM = 'Per Cbm',
  PER_KG = 'Per KG',
  PER_CONTAINER = 'Per Container',
  PER_DOCUMENT = 'Per Document',
  PER_ITEM = 'Per Item',
  PER_SHIPMENT = 'Per Shipment',
  PER_TRIP_AIR = 'Per Trip (Air)',
  PER_BOX = 'Per Box',
  PER_BL = 'Per BL',
  PER_TRIP_FCL = 'Per Trip (FCL)',
  PER_TRIP_LCL = 'Per Trip (LCL)',
}

export enum RevenueKind {
  ADJUSTMENT = 'Adjustment',
  PROGRESSION = 'Progression',
}

export enum Action {
  MANAGE = 'manage',
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
}

export enum RoleFF {
  ADMIN = 'admin',
  MANAGER = 'manager',
  STAFF = 'staff',
}

export enum Role {
  // Super admin
  SUPER_ADMIN = 'SADM',
  // Customer module
  CUSTOMER = 'CUST',
  // Freight Forwarder module
  ADMIN = 'admin',
  MANAGER = 'manager',
  STAFF = 'staff',
}

export enum InvoiceStatus {
  PROFORMA = 'PROFORMA',
  ISSUED = 'ISSUED',
  SETTLED = 'SETTLED',
  TEMPORARY = 'TEMPORARY',
}

export enum InvoiceProcess {
  TO_BE_ISSUED = 'TO_BE_ISSUED',
  WAITING_APPROVAL = 'WAITING_APPROVAL',
  NEED_REVISION = 'NEED_REVISION',
  OVERDUE = 'OVERDUE',
  PENDING = 'PENDING',
  WAITING_CONFIRMATION = 'WAITING_CONFIRMATION',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  PROFORMA_READY = 'PROFORMA_READY',
}

export enum InvoiceLabel{
  NEED_APPROVAL = 'NEED_APPROVAL',
  CHANGES_REJECTED = 'CHANGES_REJECTED',
  REVISED = 'REVISED',
}

export enum TypeOfPayment {
  CASH = 'Cash',
  SEVEN_DAYS = '7 Days',
  FOURTEEN_DAYS = '14 Days',
  THIRTY_DAYS = '30 Days',
  FORTY_FIVE_DAYS = '45 Days',
  SIXTY_DAYS = '60 Days',
}

export const TypeOfPaymentDay = {
  'Cash': 0,
  '7 Days': 7,
  '14 Days': 14,
  '30 Days': 30,
  '45 Days': 45,
  '60 Days': 60,
}

export enum PaymentHistoryPaymentStatus {
  WAITING_CONFIRMATION = 'WAITING_CONFIRMATION',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
}

export const ConsigneeLabelDetails = {
  'consigneeName' : 'Consignee Name',
  'consigneeCompany': 'Consignee Company',
  'consigneePhoneCode': 'Consignee Phone Code',
  'consigneePhone': 'Consignee Phone',
  'consigneeTaxId': 'Consignee Tax Id',
  'consigneeEmail': 'Consignee Email',
  'consigneeZipCode': 'Consignee Zip Code',
  'consigneeAddress': 'Consignee Address',
}

export const ShipperLabelDetails = {
  'shipperName' : 'Shipper Name',
  'shipperCompany': 'Shipper Company',
  'shipperPhoneCode': 'Shipper Phone Code',
  'shipperPhone': 'Shipper Phone',
  'shipperTaxId': 'Shipper Tax Id',
  'shipperEmail': 'Shipper Email',
  'shipperZipCode': 'Shipper Zip Code',
  'shipperAddress': 'Shipper Address',
}

export enum ExtendStatus {
  REQUESTED = 'REQUESTED',
  REJECTED = 'REJECTED',
  ACCEPTED = 'ACCEPTED',
}

export enum RfqLabel {
  REQUESTED = 'REQUESTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export enum QuotationFileSource {
  QUOTATION = 'QUOTATION',
  CHAT = 'CHAT',
}

export enum SeaRatesDirection {
  DEPARTURE = 'D',
  ARRIVAL = 'A',
}

export enum SeaRatesServiceMode {
  CONTAINER_YARD = 'CY',
  STORE_DOOR = 'SD',
}

export enum SubscriptionType {
  TRIAL = 'Free Trial',
  MONTHLY = 'Monthly',
  ANNUALLY = 'Annual',
}

export enum Platform {
  FF = 'FF',
  FF_CUSTOMER = 'FF Customer',
}

export enum NotificationType {
  QUOTATION = 'Quotation',
  SHIPMENT = 'Shipment',
  INVOICE = 'Invoice',
  BL = 'Bill of Lading',
  JOB_SHEET = 'Jobsheet',
}

export enum NotificationActionStatus {
  // quotation
  QUOTATION_SUBMITTED = 'QUOTATION_SUBMITTED',
  EXTENTION_QUOTATION_REJECTED = 'EXTENTION_QUOTATION_REJECTED',
  EXTENTION_QUOTATION_ACCEPTED = 'EXTENTION_QUOTATION_ACCEPTED',
  QUOTATION_REJECTED = 'QUOTATION_REJECTED',
  QUOTATION_CANCELLED = 'QUOTATION_CANCELLED',
  // shipment
  OTIF_BOOKED = 'OTIF_BOOKED',
  OTIF_SCHEDULED = 'OTIF_SCHEDULED',
  OTIF_PICKUP = 'OTIF_PICKUP',
  OTIF_ORIGIN_LOCAL_HANDLING = 'OTIF_ORIGIN_LOCAL_HANDLING',
  OTIF_DEPARTURE = 'OTIF_DEPARTURE',
  OTIF_ARRIVAL = 'OTIF_ARRIVAL',
  OTIF_DESTINATION_LOCAL_HANDLING = 'OTIF_DESTINATION_LOCAL_HANDLING',
  OTIF_DELIVERY = 'OTIF_DELIVERY',
  OTIF_COMPLETE = 'OTIF_COMPLETE',
  OTIF_REJECTED = 'OTIF_REJECTED',
  OTIF_CANCELLED = 'OTIF_CANCELLED',
  OTIF_DELAYED = 'OTIF_DELAYED',
  // invoice
  PROFORMA_INVOICE_ISSUED = 'PROFORMA_INVOICE_ISSUED',
  INVOICE_PAYMENT_REJECTED = 'INVOICE_PAYMENT_REJECTED',
  INVOICE_EDIT_NEED_APPROVAL = 'INVOICE_EDIT_NEED_APPROVAL',
  INVOICE_EDIT_APPROVED = 'INVOICE_EDIT_APPROVED',
  INVOICE_EDIT_REJECTED = 'INVOICE_EDIT_REJECTED',
  // Bill OF Lading
  BL_TEMPLATE_REJECTED = 'BL_TEMPLATE_REJECTED',
  BL_TEMPLATE_DONE = 'BL_TEMPLATE_DONE',
  BL_TEMPLATE_ON_PROGRESS = 'BL_TEMPLATE_ON_PROGRESS',
  BL_TEMPLATE_REMINDER = 'BL_TEMPLATE_REMINDER',
  // Job Sheet Payable
  JOB_SHEET_PAYABLE_APPROVED = 'APPROVED',
  JOB_SHEET_PAYABLE_REJECTED = 'REJECTED',
  JOB_SHEET_PAYABLE_WAITING_CONFIRMATION = 'WAITING_APPROVAL',
  JOB_SHEET_RECEIVABLE_WAITING_CONFIRMATION = 'RECEIVABLE_WAITING_APPROVAL',

  REMOVE_FILE_REQUEST = 'REMOVE_FILE_REQUEST',
  REMOVE_FILE_REJECT = 'REMOVE_FILE_REJECT',
  REMOVE_FILE_APPROVED = 'REMOVE_FILE_APPROVED',
}

export enum ShipmentSellingPriceType {
  SHIPMENT = 'SHIPMENT',
  TEMP_INVOICE = 'TEMP_INVOICE',
  INVOICE = 'INVOICE',
  CLOSED_INVOICE = 'CLOSED_INVOICE',
}

export enum TemporaryProformaStatus {
  DRAFT = 'DRAFT',
  PROGRESS = 'PROGRESS',
  CREATED = 'CREATED',
}

export enum TempActiveFinish {
  ACTIVE = 'ACTIVE',
  FINISH = 'FINISH',
}

export enum EAffiliation {
  ANDALIN = 'ANDALIN',
  TRIAL = 'TRIAL',
  DUMMY = 'DUMMY',
}

export enum JobSheetItemType {
  AR = 'AR',
  AP = 'AP',
  AP_AR = 'AP|AR',
}

export enum JobSheetReceivableStatus {
  WAITING_APPROVAL = 'WAITING_APPROVAL',
  APPROVED = 'APPROVED',
  ISSUED = 'ISSUED',
  PENDING = 'PENDING',
  PAID = 'PAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  REJECTED = 'REJECTED',
  SETTLED = 'SETTLED',
}

export enum JobSheetPayableStatus {
  WAITING_APPROVAL = 'WAITING_APPROVAL',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  REJECTED = 'REJECTED',
}

export enum JobSheetReceivableHistoryAction {
  CREATED = 'CREATED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REVISION = 'REVISION',
  EDITED = 'EDITED',
  ISSUED = 'ISSUED',
  APPROVAL_CHANGES = 'APPROVAL_CHANGES',
  APPROVAL_CHANGES_APPROVED = 'APPROVAL_CHANGES_APPROVED',
  APPROVAL_CHANGES_REJECTED = 'APPROVAL_CHANGES_REJECTED',
}

export const JobSheetReceivableHistoryActionLabel = {
  'CREATED' : 'Create and Submit AR Job Sheet',
  'APPROVED': 'AR Job Sheet has been approved',
  'ISSUED': 'AR Job Sheet has been issued',
  'REJECTED': 'Reason : ',
  'REVISION': 'AR Jobsheet has been revised ',
  'EDITED': 'Edited ',
  'APPROVAL_CHANGES': 'Approval Changes ',
  'APPROVAL_CHANGES_APPROVED': 'Approved',
  'APPROVAL_CHANGES_REJECTED': 'Rejected',
}

export enum JobSheetPayableHistoryAction {
  CREATED = 'CREATED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REVISE = 'REVISE',
}

export enum Features {
  ALL_FEATURES = 1,
  CRM = 2,
  FINANCE = 3,
  TMS = 4,
}

export const JobSheetHistoryActionLabel = {
  'CREATED' : 'Create and Submit AP Job Sheet',
  'APPROVED': 'AP Job Sheet has been approved',
  'REJECTED': 'Reason : ',
  'REVISE': 'Submit Revision',
}

export const CeisaAccessTokenExpired = 300

export enum FileStatus {
  ACTIVE = 'ACTIVE',
  REQUEST_DELETE = 'REQUEST_DELETE',
  DELETED = 'DELETED',
}

export enum ShipmentLabel {
  NEED_APPROVAL = 'Need Approval',
  CHANGES_REJECTED = 'Changes Rejected',
  REVISED = 'Revised',
}

export enum InvoiceHistoryStatusApproval {
  NEED_APPROVAL = 'NEED_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum JobSheetAllStatus {
  'WAITING_APPROVAL_AR' = 'Waiting for Approval (AR)',
  'WAITING_APPROVAL_AP' = 'Waiting for Approval (AP)',
  'APPROVED_AR' = 'Approved (AR)',
  'APPROVED_AP' = 'Approved (AP)',
  'PENDING_AR' = 'Pending Payment (AR)',
  'PARTIALLY_PAID_AR' = 'Partially Paid (AR)',
  'PARTIALLY_PAID_AP' = 'Partially Paid (AP)',
  'PAID_AR' = 'Paid (AR)',
  'PAID_AP' = 'Paid (AP)',
  'REJECTED_AR' = 'Rejected (AR)',
  'REJECTED_AP' = 'Rejected (AP)',
}

export enum SlackEndpoint {
  SEND_NOTIFICATION = 'send-notification',
}

export enum QuotationRevenueHistoryAction {
  PROPOSITION = 'PROPOSITION',
  NEGOTIATION = 'NEGOTIATION',
  WON = 'WON',
  LOSS = 'LOSS',
}

export enum QuotationRevenueHistoryActionLabel {
  PROPOSITION = 'Proposition Created',
  NEGOTIATION = 'Moved to Negotiation',
  WON = 'Moved to Won',
  LOSS = 'Moved to Loss',
}
