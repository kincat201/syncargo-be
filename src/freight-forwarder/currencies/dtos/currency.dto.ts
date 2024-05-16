import { IsString, IsEmail, IsNumber, isNumber } from 'class-validator';

export class CurrencyDto {
  @IsString()
  name: string;

  @IsNumber()
  createdByUserId: number;

  @IsNumber()
  status: number;
}
