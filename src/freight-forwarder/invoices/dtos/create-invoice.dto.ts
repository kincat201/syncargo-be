import { Type } from "class-transformer";
import { ArrayMinSize, ArrayNotEmpty, IsArray, IsBoolean, IsNumber, IsOptional, IsPositive, IsString, MaxLength, Min, ValidateNested } from "class-validator";
import { SellingPriceDto } from "src/freight-forwarder/shipment-selling-prices/dtos/selling-price.dto";

export class CreateInvoiceDto {
  @IsString()
  rfqNumber: string;

  @IsString()
  customerId: string;

  // only for split temporary price
  @IsOptional()
  @IsBoolean()
  defaultPpn: boolean;

  // only for split temporary price
  @IsOptional()
  @IsNumber()
  @Min(0)
  ppn: number;

  // only for split temporary price
  @IsOptional()
  @IsNumber()
  @Min(0)
  exchangeRate: number;

  // only for split temporary price
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

  // only for split temporary price
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SellingPriceDto)
  sellingPrices: SellingPriceDto[];
}
