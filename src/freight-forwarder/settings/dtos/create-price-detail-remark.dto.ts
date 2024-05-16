import { IsOptional, IsString } from 'class-validator';

export class CreatePriceDetailRemarkDto {
  @IsOptional()
  @IsString()
  priceDetailRemark: string;
}
