import {
  IsBoolean,
  IsNotEmpty, IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class RemittanceReceivableJobSheetReceivableDto {

  @IsNumber()
  @IsNotEmpty()
  jobSheetReceivablePaymentId: string;

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
