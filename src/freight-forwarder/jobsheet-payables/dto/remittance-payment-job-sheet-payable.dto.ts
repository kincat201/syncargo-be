import {
  IsBoolean,
  IsNotEmpty, IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class RemittancePaymentJobSheetPayableDto {

  @IsNumber()
  @IsNotEmpty()
  jobSheetPayablePaymentId: string;

  @IsString()
  @IsNotEmpty()
  sendingTo: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  sendCopy: boolean;
}
