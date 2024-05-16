import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class CreateThirdPartyRequest {
  @IsString()
  picName: string;

  @IsString()
  companyName: string;

  @IsString()
  currency: string;

  @IsString()
  typeOfPayment: string;

  @IsString()
  phoneCode: string;

  @IsString()
  phoneNumber: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  businessLicense?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  address: string;
}