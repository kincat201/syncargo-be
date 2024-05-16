import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { ShipmentType } from '../../../enums/enum';

export class FilterFFDto {
  @IsOptional()
  @IsString()
  search: string;
}

export class FilterCustomerDto {
  @IsOptional()
  @IsString()
  search: string;
}

export class FilterRoomDto {
  @IsString()
  customerId: string;

  @IsOptional()
  companyId: number;

  @IsOptional()
  @IsString()
  search: string;

  @IsOptional()
  isRead: number;

  @IsOptional()
  @IsString()
  shipmentVia: string;

  @IsOptional()
  @IsEnum(ShipmentType)
  shipmentType: string;

  @IsOptional()
  @IsString()
  origin: string;

  @IsOptional()
  @IsString()
  destination: string;

  @IsOptional()
  @IsString()
  date: string;
}

export class FilterMessageDto {
  @IsOptional()
  @IsString()
  roomId: string;

  @IsOptional()
  @IsNumber()
  page: number;

  @IsOptional()
  @IsNumber()
  limit: number;
}
