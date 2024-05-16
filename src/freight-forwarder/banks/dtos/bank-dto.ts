import { IsString, IsEmail, IsNumber, isNumber } from 'class-validator';

export class BankDto {
  @IsString()
  name: string;

  @IsNumber()
  createdByUserId: number;

  @IsNumber()
  status: number;
}
