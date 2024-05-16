import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ShipmentService, ShipmentVia } from '../../../enums/enum';

export class SaveJobSheetShipmentDto {

  @IsOptional()
  @IsIn(Object.values(ShipmentVia))
  shipmentVia: ShipmentVia;

  @IsOptional()
  @IsIn(Object.values(ShipmentService))
  shipmentService: ShipmentService;

  @IsOptional()
  @IsString()
  countryFrom: string;

  @IsOptional()
  @IsString()
  countryFromCode: string;

  @IsOptional()
  @Min(1)
  @IsNumber()
  countryFromId: number;

  @IsOptional()
  @IsString()
  cityFrom: string;

  @IsOptional()
  @IsString()
  portOfLoading: string;

  @IsOptional()
  @IsString()
  countryTo: string;

  @IsOptional()
  @IsString()
  countryToCode: string;

  @IsOptional()
  @Min(1)
  @IsNumber()
  countryToId: number;

  @IsOptional()
  @IsString()
  cityTo: string;

  @IsOptional()
  @IsString()
  portOfDischarge: string;

  @IsOptional()
  @IsString()
  remarks: string;

}
