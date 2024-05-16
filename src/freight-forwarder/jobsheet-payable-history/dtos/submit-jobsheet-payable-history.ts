import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
export class SubmitJobSheetPayableHistory {
  @IsString()
  @IsNotEmpty()
  action: string;

  @IsString()
  @IsOptional()
  details: string;
}
