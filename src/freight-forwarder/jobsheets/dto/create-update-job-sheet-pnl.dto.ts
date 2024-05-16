import { IsString, IsNumber, IsNotEmpty } from 'class-validator';

export class CreateUpdateJobSheetPnlDto {

  @IsNotEmpty()
  @IsNumber()
  exchangeRate : number;
  
  @IsNotEmpty()
  @IsString()
  currency : string;

}
