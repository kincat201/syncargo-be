import {
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsNotEmpty, IsNumber, IsOptional,
  IsString,
  MaxLength, Min,
  ValidateNested,
} from 'class-validator';
import { ShipmentType } from '../../../enums/enum';
import { Type } from 'class-transformer';
import { CreateVendorPriceComponentDto } from './create-vendor-price-component.dto';

export class CreateVendorPriceDto {
  @IsString()
  @IsNotEmpty()
  vendorName: string;

  @IsString()
  @IsNotEmpty()
  label: string;

  @IsIn(Object.values(ShipmentType))
  shipmentType: ShipmentType;

  @IsNotEmpty()
  @IsString()
  countryFrom: string;

  @IsNotEmpty()
  @IsString()
  countryFromCode: string;

  @Min(1)
  @IsNumber()
  countryFromId: number;

  @IsOptional()
  @IsString()
  cityFrom: string;

  @IsNotEmpty()
  @IsString()
  countryTo: string;

  @IsNotEmpty()
  @IsString()
  countryToCode: string;

  @Min(1)
  @IsNumber()
  countryToId: number;

  @IsOptional()
  @IsString()
  cityTo: string;

  @IsString()
  @MaxLength(8)
  currency: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @ValidateNested({each: true})
  @Type(() => CreateVendorPriceComponentDto)
  priceComponents: CreateVendorPriceComponentDto[]
}
