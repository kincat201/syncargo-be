import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
export class SubmitJobsheetReceivableHistory {
  @IsString()
  @IsNotEmpty()
  action: string;

  @IsString()
  @IsOptional()
  details: string;
}
