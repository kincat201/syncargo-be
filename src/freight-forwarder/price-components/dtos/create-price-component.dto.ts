import { IsString } from 'class-validator';

export class CreatePriceComponentDto {
  @IsString()
  code: string;

  @IsString()
  name: string;
}
