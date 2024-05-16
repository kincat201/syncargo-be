import { Type } from "class-transformer";
import {
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
  IsBoolean,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { SellingPriceDto } from "src/freight-forwarder/shipment-selling-prices/dtos/selling-price.dto";

export class ReviseJobSheetReceivableDto {

  @IsOptional()
  @IsString()
  invoiceNumber: string;

  @IsOptional()
  @IsString()
  customerId: string;

  @IsNumber()
  @Min(0)
  ppn: number;

  @IsBoolean()
  defaultPpn: boolean;

  @IsNumber()
  @Min(0)
  exchangeRate: number;

  @IsString()
  currency: string;

  @IsOptional()
  @IsNumber()
  thirdPartyId: number;

  @IsOptional()
  @IsString()
  @MaxLength(25)
  referenceNumber: string;

  @IsOptional()
  @IsString()
  invoiceDate: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SellingPriceDto)
  sellingPrices: SellingPriceDto[];
}
