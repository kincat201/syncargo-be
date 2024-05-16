import { Type } from "class-transformer";
import {
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { SellingPriceDto } from "src/freight-forwarder/shipment-selling-prices/dtos/selling-price.dto";

export class CreateJobSheetReceivableDto {

  @IsString()
  @IsNotEmpty()
  jobSheetNumber: string;

  @IsString()
  @IsNotEmpty()
  invoiceNumber: string;

  @IsOptional()
  @IsString()
  customerId: string;

  @IsOptional()
  @IsBoolean()
  defaultPpn: boolean;

  @IsString()
  @IsNotEmpty()
  invoiceDate: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  ppn: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  exchangeRate: number;

  @IsOptional()
  @IsNumber()
  thirdPartyId: number;

  @IsString()
  @IsOptional()
  currency: string;

  @IsOptional()
  @IsString()
  @MaxLength(25)
  referenceNumber: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SellingPriceDto)
  sellingPrices: SellingPriceDto[];
}
