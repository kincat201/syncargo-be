import { IsOptional, IsString } from 'class-validator';

export class CreateQuotationNotesDto {
  @IsOptional()
  @IsString()
  quotationNotes: string;

  @IsOptional()
  @IsString()
  quotationRemark: string;
}
