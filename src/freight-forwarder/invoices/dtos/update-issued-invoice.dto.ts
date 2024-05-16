import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateIssuedInvoiceDto {
  @IsString()
  @IsNotEmpty()
  invoiceDate: string;
}
