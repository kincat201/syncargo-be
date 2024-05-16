import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
  IsNotEmpty,
  Min,
  ArrayNotEmpty,
  ArrayMinSize,
  Max,
  IsEmail, 
} from 'class-validator';
import {
  CustomerPosition,
  ProductType,
  RouteType,
  ShipmentService,
  ShipmentType,
  ShipmentVia,
} from 'src/enums/enum';
import { PackingListDto } from './packing-list.dto';

export class UpdateQuotationDto {
  @IsNotEmpty()
  @IsString()
  customerId: string;

  // shipping section
  @IsOptional()
  @IsIn(Object.values(ShipmentVia))
  shipmentVia: ShipmentVia;

  @IsOptional()
  @IsIn(Object.values(ShipmentService))
  shipmentService: ShipmentService;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  countryFrom: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  countryFromCode: string;

  @IsOptional()
  @Min(1)
  @IsNumber()
  countryFromId: number;

  @IsOptional()
  @IsString()
  cityFrom: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  addressFrom: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  zipcodeFrom: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  portOfLoading: string;

  @IsOptional()
  @IsString()
  countryTo: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  countryToCode: string;

  @IsOptional()
  @Min(1)
  @IsNumber()
  countryToId: number;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  cityTo: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  addressTo: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  zipcodeTo: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  portOfDischarge: string;

  @IsOptional()
  @IsIn(Object.values(CustomerPosition))
  customerPosition: CustomerPosition;

  @IsOptional()
  @IsIn(Object.values(RouteType))
  routeType: RouteType;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  shipmentDate: string;

  // shipment type section
  @IsOptional()
  @IsIn(Object.values(ShipmentType))
  shipmentType: ShipmentType;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PackingListDto)
  packingList: PackingListDto[];

  // product type section
  @IsOptional()
  @IsIn(Object.values(ProductType))
  productType: ProductType;

  @IsOptional()
  @IsString()
  kindOfGoods: string;

  @IsOptional()
  @Min(0)
  @Max(9999999999999999)
  @IsNumber()
  valueOfGoods: number;

  @IsOptional()
  @IsString()
  currency: string;

  @IsOptional()
  @IsString()
  hsCode: string;

  @IsOptional()
  @IsString()
  poNumber: string;

  @IsOptional()
  @IsString()
  unNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description: string;

  // shipper
  @IsString()
  @IsOptional()
  shipperName: string;

  @IsString()
  @IsOptional()
  shipperCompany: string;

  @IsString()
  @IsOptional()
  shipperPhone: string;

  @IsString()
  @IsOptional()
  shipperPhoneCode: string;

  @IsString()
  @IsOptional()
  shipperTaxId: string;

  @IsEmail()
  @IsOptional()
  shipperEmail: string;

  @IsString()
  @IsOptional()
  shipperZipCode: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  shipperAddress: string;

  // consignee
  @IsString()
  @IsOptional()
  consigneeName: string;

  @IsString()
  @IsOptional()
  consigneeCompany: string;

  @IsString()
  @IsOptional()
  consigneePhoneCode: string;

  @IsString()
  @IsOptional()
  consigneePhone: string;

  @IsString()
  @IsOptional()
  consigneeTaxId: string;

  @IsEmail()
  @IsOptional()
  consigneeEmail: string;

  @IsString()
  @IsOptional()
  consigneeZipCode: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  consigneeAddress: string;

  // additional section
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark: string;

  @IsOptional()
  @IsBoolean()
  originCustomsClearance: boolean;

  @IsOptional()
  @IsBoolean()
  destinationCustomsClearance: boolean;

  @IsOptional()
  @IsBoolean()
  warehouseStorage: boolean;
}
