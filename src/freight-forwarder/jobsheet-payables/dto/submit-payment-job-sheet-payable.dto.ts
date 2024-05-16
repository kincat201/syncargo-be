import { IsNotEmpty, IsString } from 'class-validator';

export class SubmitPaymentJobSheetPayableDto {

  @IsNotEmpty()
  @IsString()
  currency: string;

  @IsNotEmpty()
  @IsString()
  amountPaid: number;

  @IsNotEmpty()
  @IsString()
  paymentDate: string;

  @IsNotEmpty()
  @IsString()
  bankAccount: string;

  @IsNotEmpty()
  @IsString()
  bankHolder: string;
}
