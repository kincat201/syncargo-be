import { IsOptional, IsString } from 'class-validator';

export class UpdatePriceComponentDto {
  @IsString()
  @IsOptional()
  code: string;

  @IsString()
  @IsOptional()
  name: string;
}
