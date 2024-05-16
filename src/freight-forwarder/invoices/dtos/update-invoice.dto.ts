import { Type } from "class-transformer";
import { ArrayMinSize, ArrayNotEmpty, IsArray, IsNumber, IsString, Min, ValidateNested, IsBoolean, IsPositive, IsOptional, MaxLength } from "class-validator";
import { SellingPriceDto } from "src/freight-forwarder/shipment-selling-prices/dtos/selling-price.dto";

export class UpdateInvoiceDto {
  @IsNumber()
  @Min(0)
  ppn: number;

  @IsBoolean()
  defaultPpn: boolean;

  @IsNumber()
  @Min(0)
  exchangeRate: number;

  @IsOptional()
  @IsNumber()
  thirdPartyId: number;

  @IsString()
  currency: string;

  @IsOptional()
  @IsString()
  @MaxLength(25)
  referenceNumber: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SellingPriceDto)
  sellingPrices: SellingPriceDto[];
}
