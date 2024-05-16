import {
  IsString,
  IsEmail,
  MaxLength,
  MinLength,
  IsNumberString,
} from 'class-validator';

export class SubmitShipperConsigneeDto {
  // shipper
  @IsString()
  @MinLength(1)
  shipperName: string;

  @IsString()
  @MinLength(1)
  shipperCompany: string;

  @IsNumberString()
  shipperPhoneCode: string;

  @IsNumberString()
  shipperPhone: string;

  @IsString()
  @MinLength(1)
  shipperTaxId: string;

  @IsEmail()
  shipperEmail: string;

  @IsString()
  @MinLength(1)
  shipperZipCode: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  shipperAddress: string;

  // consignee
  @IsString()
  @MinLength(1)
  consigneeName: string;

  @IsString()
  @MinLength(1)
  consigneeCompany: string;

  @IsNumberString()
  consigneePhoneCode: string;

  @IsNumberString()
  consigneePhone: string;

  @IsString()
  @MinLength(1)
  consigneeTaxId: string;

  @IsEmail()
  consigneeEmail: string;

  @IsString()
  @MinLength(1)
  consigneeZipCode: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  consigneeAddress: string;
}
