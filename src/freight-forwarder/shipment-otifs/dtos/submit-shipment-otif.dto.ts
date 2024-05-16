import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ArrayMinSize,
  IsIn,
} from 'class-validator';
import { OtifStatus } from 'src/enums/enum';

export class SubmitShipmentOtifDto {
  @IsIn(Object.values(OtifStatus))
  otifStatus: OtifStatus;

  @IsOptional()
  @IsString()
  documentDate: string;

  @IsOptional()
  @IsString()
  etd: string;

  @IsOptional()
  @IsString()
  etdTime: string;

  @IsOptional()
  @IsString()
  eta: string;

  @IsOptional()
  @IsString()
  etaTime: string;

  @IsOptional()
  @IsString()
  pickupDate: string;

  @IsOptional()
  @IsString()
  pickupTime: string;

  @IsOptional()
  @IsString()
  location: string;

  @IsOptional()
  @IsString()
  driverName: string;

  @IsOptional()
  @IsString()
  driverPhone: string;

  @IsOptional()
  @IsString()
  vehiclePlateNumber: string;

  @IsOptional()
  @IsNumber()
  grossWeight: number;

  @IsOptional()
  @IsNumber()
  nettWeight: number;

  @IsOptional()
  @IsString()
  masterAwb: string;

  @IsOptional()
  @IsString()
  houseAwb: string;

  @IsOptional()
  @IsString()
  activity: string;

  @IsOptional()
  @IsString()
  noPeb: string;

  @IsOptional()
  @IsString()
  portOfLoading: string;

  @IsOptional()
  @IsString()
  shippingLine: string;

  @IsOptional()
  @IsString()
  shippingNumber: string;

  @IsOptional()
  @IsString()
  portOfDischarge: string;

  @IsOptional()
  @IsString()
  reasonFailed: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  containerNumber: [];
}
