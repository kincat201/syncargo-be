import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CreateBidPriceDto } from './create-bid-price.dto';

export class CreateBidDto {
  @IsNumber()
  rfqId: number;

  @IsDateString()
  @IsOptional()
  validUntil: string;

  @IsString()
  @IsOptional()
  shippingLine: string;

  @IsString()
  @IsOptional()
  vendorName: string;

  @IsNumber()
  @Min(0)
  minDelivery: number;

  @IsNumber()
  @Min(0)
  maxDelivery: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  note: string;

  @IsBoolean()
  @IsOptional()
  showSubtotal: boolean;

  @IsString()
  @IsOptional()
  currency: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateBidPriceDto)
  bidPrices: CreateBidPriceDto[];
}
