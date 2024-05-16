import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class ExtendQuotationDto {
  @IsIn(['EXTEND', 'ACCEPT', 'REJECT'])
  type: string;

  @IsOptional()
  @IsDateString()
  date: string;
}
