import { IsString } from 'class-validator';

export class CreateCreditCheckRequest {
  @IsString()
  companyName: string;

  @IsString()
  npwp: string;

  @IsString()
  picName: string;

  @IsString()
  phoneCode: string;

  @IsString()
  phoneNumber: string;

  @IsString()
  location: string;
}
