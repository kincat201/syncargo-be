import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { SeaRatesDirection, SeaRatesServiceMode } from '../../../enums/enum';

export class GetScheduleDto {
  @IsString()
  @IsNotEmpty()
  sealine: string;

  @IsString()
  @IsNotEmpty()
  portcode: string;

  @IsString()
  @IsNotEmpty()
  portdestinationcode: string;

  @IsString()
  @IsNotEmpty()
  fromdate: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  weeksahead: number;

  @IsIn(Object.values(SeaRatesDirection))
  direction: string;

  @IsString()
  @IsOptional()
  @IsIn(Object.values(SeaRatesServiceMode))
  serviceModeFrom: string;

  @IsString()
  @IsOptional()
  @IsIn(Object.values(SeaRatesServiceMode))
  serviceModeTo: string;
}
