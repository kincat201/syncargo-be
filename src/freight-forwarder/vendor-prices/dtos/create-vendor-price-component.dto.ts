import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Uom } from 'src/enums/enum';

export class CreateVendorPriceComponentDto {
  @IsString()
  @IsNotEmpty()
  priceCompName: string;

  @IsIn(Object.values(Uom))
  uom: Uom;

  @IsNumber()
  @Min(1)
  price: number;

  @IsNumber()
  profit: number;

  @IsNumber()
  @Min(1)
  total: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  note: string;
}
