import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateInvoiceRemarkDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  invoiceRemark: string;
}
