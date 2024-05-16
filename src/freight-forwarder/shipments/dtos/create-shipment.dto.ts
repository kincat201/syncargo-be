import {
  IsString,
  IsOptional,
  IsEmail,
  IsArray,
  MaxLength,
} from 'class-validator';

export class CreateShipmentDto {
  @IsString()
  shippingLine: string;

  @IsString()
  vendor: string;

  @IsOptional()
  @IsString()
  masterBl: string;

  @IsOptional()
  @IsString()
  masterBlType: string;

  @IsOptional()
  @IsString()
  houseBl: string;

  @IsOptional()
  @IsString()
  houseBlType: string;

  @IsOptional()
  @IsString()
  terms: string;

  // shipper
  @IsString()
  shipperName: string;

  @IsString()
  shipperCompany: string;

  @IsString()
  shipperPhone: string;

  @IsString()
  shipperPhoneCode: string;

  @IsString()
  shipperTaxId: string;

  @IsEmail()
  shipperEmail: string;

  @IsString()
  shipperZipCode: string;

  @IsString()
  @MaxLength(500)
  shipperAddress: string;

  // consignee
  @IsString()
  consigneeName: string;

  @IsString()
  consigneeCompany: string;

  @IsString()
  consigneePhoneCode: string;

  @IsString()
  consigneePhone: string;

  @IsString()
  consigneeTaxId: string;

  @IsEmail()
  consigneeEmail: string;

  @IsString()
  consigneeZipCode: string;

  @IsString()
  @MaxLength(500)
  consigneeAddress: string;

  @IsOptional()
  @IsArray()
  blHistory: Array<{
    blType: string;
    userId: number;
    activity: string;
    dateTime: Date;
  }>;
}
