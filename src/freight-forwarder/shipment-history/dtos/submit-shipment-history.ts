import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
export class SubmitShipmentHistory {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  details: string;
}
