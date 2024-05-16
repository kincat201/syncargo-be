import { IsBoolean, IsIn, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { Uom } from 'src/enums/enum';

export class SellingPriceDto {
  // only for temporary price
  @IsOptional()
  @IsNumber()
  @Min(1)
  id: number;

  @IsString()
  @IsNotEmpty()
  priceComponent: string;

  @IsIn(Object.values(Uom))
  uom: Uom;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  convertedPrice: number;

  @IsNumber()
  @Min(0)
  qty: number;

  @IsNumber()
  @Min(0)
  subtotal: number;

  @IsNumber()
  @Min(0)
  subtotalCurrency: number;

  // only for split/create and update invoice
  @IsOptional()
  @IsNumber()
  @Min(0)
  ppn: number;

  // only for split/create and update invoice
  @IsOptional()
  @IsNumber()
  @Min(0)
  total: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalCurrency: number;

  @IsString()
  @IsOptional()
  note: string;

  // only for save temporary price
  @IsOptional()
  @IsBoolean()
  fromShipment: boolean;
}
