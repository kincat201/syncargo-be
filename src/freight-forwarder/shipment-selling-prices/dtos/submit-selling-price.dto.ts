import { Type } from "class-transformer";
import {
  IsArray,
  ArrayNotEmpty,
  ArrayMinSize,
  ValidateNested,
  IsBoolean,
  IsOptional,
  IsNumber,
  Min,
  IsString,
  IsPositive,
} from 'class-validator';
import { SellingPriceDto } from "../../shipment-selling-prices/dtos/selling-price.dto";

export class SubmitSellingPriceDto {
  // only for save temporary price
  @IsOptional()
  @IsBoolean()
  defaultPpn: boolean;

  // only for save temporary price
  @IsOptional()
  @IsNumber()
  @Min(0)
  ppn: number;

  @IsNumber()
  @Min(0)
  exchangeRate: number;

  @IsString()
  @IsOptional()
  currency: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SellingPriceDto)
  sellingPrices: SellingPriceDto[];
}
