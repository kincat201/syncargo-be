import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateBidPriceDto } from './create-bid-price.dto';
import { IsBoolean } from 'class-validator';

export class CreateDraftBidDto {
  @IsNumber()
  rfqId: number;

  @IsOptional()
  @IsString()
  validUntil: string;

  @IsOptional()
  @IsString()
  shippingLine: string;

  @IsOptional()
  @IsString()
  vendorName: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minDelivery: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDelivery: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  note: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency: string;

  @IsBoolean()
  @IsOptional()
  showSubtotal: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBidPriceDto)
  bidPrices: CreateBidPriceDto[];
}
