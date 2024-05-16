import { IsNumberString, IsString, MaxLength } from 'class-validator';

export class PaymentAdviceDto {
  @IsString()
  bankName: string;

  @IsString()
  currencyName: string;

  @IsNumberString()
  @MaxLength(25)
  accNumber: string;

  @IsString()
  accHolder: string;

  @IsString()
  @MaxLength(500)
  paymentInstructions: string;
}
