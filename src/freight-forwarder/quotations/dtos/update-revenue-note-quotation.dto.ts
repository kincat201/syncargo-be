import { IsOptional, IsString } from 'class-validator';

export class UpdateRevenueNoteQuotation {
  @IsOptional()
  @IsString()
  revenueNote: string;
}
