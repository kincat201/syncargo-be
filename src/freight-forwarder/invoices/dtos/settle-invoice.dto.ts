import { IsNumberString, IsString, Min } from 'class-validator';

export class SettleInvoiceDto {
  @IsString()
  paymentDate: string;

  @IsString()
  bank: string;

  @IsString()
  bankHolder: string;

  @IsNumberString()
  settledAmount: string;

  @IsString()
  paymentCurrency: string;
}
