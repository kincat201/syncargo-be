import { IsOptional, IsString } from 'class-validator';

export class UpdateOriginDestinationDto {
  @IsOptional()
  @IsString()
  cityName: string;

  @IsOptional()
  @IsString()
  cityCode: string;
}
