import { IsEmail, IsNumberString, IsOptional, IsString } from 'class-validator';

export class ShareQuotationDto {
  @IsString()
  via: string;

  @IsOptional()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsNumberString()
  phone: string;
}
