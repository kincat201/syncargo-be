import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Uom } from 'src/enums/enum';

export class CreateBidPriceDto {
  @IsString()
  @IsNotEmpty()
  priceCompName: string;

  @IsIn(Object.values(Uom))
  uom: Uom;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  profit: number;

  @IsNumber()
  @Min(0)
  total: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  note: string;
}
