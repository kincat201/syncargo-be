import {
  IsIn,
  IsNotEmpty,
  IsNumber, IsNumberString,
  IsString,
  Min,
} from 'class-validator';
import { Uom } from 'src/enums/enum';
import { Transform } from 'class-transformer';

export class CreateJobSheetPayablePriceDto {

  @IsString()
  @IsNotEmpty()
  priceComponent: string;

  @IsIn(Object.values(Uom))
  uom: Uom;

  @IsNotEmpty()
  @IsString()
  currency: string;

  @IsNotEmpty()
  priceAmount: number;

  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  @Min(1)
  qty: number;

  @IsNotEmpty()
  ppn: number;
}
