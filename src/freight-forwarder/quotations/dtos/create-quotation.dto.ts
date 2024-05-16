import { Type } from 'class-transformer';
import { ArrayMinSize, ArrayNotEmpty, IsArray, IsBoolean, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator'
import { 
  CustomerPosition, 
  ProductType, 
  RouteType, 
  ShipmentService, 
  ShipmentType, 
  ShipmentVia 
} from 'src/enums/enum';
import { PackingListDto } from './packing-list.dto';

export class CreateQuotationDto {
  @IsNotEmpty()
  @IsString()
  customerId: string;

  // shipping section
  @IsIn(Object.values(ShipmentVia))
  shipmentVia: ShipmentVia;

  @IsIn(Object.values(ShipmentService))
  shipmentService: ShipmentService;

  @IsNotEmpty()
  @IsString()
  countryFrom: string;

  @IsNotEmpty()
  @IsString()
  countryFromCode: string;

  @Min(1)
  @IsNumber()
  countryFromId: number;

  @IsOptional()
  @IsString()
  cityFrom: string;

  @IsNotEmpty()
  @IsString()
  portOfLoading: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  addressFrom: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  zipcodeFrom: string;

  @IsNotEmpty()
  @IsString()
  countryTo: string;

  @IsNotEmpty()
  @IsString()
  countryToCode: string;

  @Min(1)
  @IsNumber()
  countryToId: number;

  @IsOptional()
  @IsString()
  cityTo: string;

  @IsNotEmpty()
  @IsString()
  portOfDischarge: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  addressTo: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  zipcodeTo: string;

  @IsIn(Object.values(CustomerPosition))
  customerPosition: CustomerPosition;

  @IsIn(Object.values(RouteType))
  routeType: RouteType;

  @IsNotEmpty()
  @IsString()
  shipmentDate: string;

  // shipment type section
  @IsIn(Object.values(ShipmentType))
  shipmentType: ShipmentType;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PackingListDto)
  packingList: PackingListDto[];

  // product type section
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
