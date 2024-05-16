import { IsString, MaxLength, IsOptional } from 'class-validator';

export class SubmitDraftShipperConsigneeDto {
  // shipper
  @IsOptional()
  @IsString()
  shipperName: string;

  @IsOptional()
  @IsString()
  shipperCompany: string;

  @IsOptional()
  @IsString()
  shipperPhoneCode: string;

  @IsOptional()
  @IsString()
  shipperPhone: string;

  @IsOptional()
  @IsString()
  shipperTaxId: string;

  @IsOptional()
  @IsString()
  shipperEmail: string;

  @IsOptional()
  @IsString()
  shipperZipCode: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  shipperAddress: string;

  // consignee
  @IsOptional()
  @IsString()
  consigneeName: string;

  @IsOptional()
  @IsString()
  consigneeCompany: string;

  @IsOptional()
  @IsString()
  consigneePhoneCode: string;

  @IsOptional()
  @IsString()
  consigneePhone: string;

  @IsOptional()
  @IsString()
  consigneeTaxId: string;

  @IsOptional()
  @IsString()
  consigneeEmail: string;

  @IsOptional()
  @IsString()
  consigneeZipCode: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  consigneeAddress: string;
}
