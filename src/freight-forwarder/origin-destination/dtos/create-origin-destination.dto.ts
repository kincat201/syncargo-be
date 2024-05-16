import { IsString } from 'class-validator';

export class CreateOriginDestinationDto {
  @IsString()
  countryName: string;
  @IsString()
  cityName: string;
  @IsString()
  countryCode: string;
  @IsString()
  cityCode: string;
}
