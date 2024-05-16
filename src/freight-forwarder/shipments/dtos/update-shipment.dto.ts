import { BlTemplateType } from '../../../enums/enum';
import { UpdateQuotationDto } from '../../quotations/dtos/update-quotation.dto';

import {
  IsString,
  IsOptional,
  IsEmail,
  MaxLength,
  IsArray,
  ArrayMinSize,
  IsNumber,
  IsEnum,
  ValidateNested,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';

enum BL_INSURANCE {
  COVERED = 'COVERED',
  NOTCOVERED = 'NOTCOVERED',
}
export class UpdateShipmentDto {
  @IsOptional()
  @IsString()
  rfqNumber;

  @IsOptional()
  @IsString()
  shippingLine: string;

  @IsOptional()
  @IsString()
  vendor: string;

  @IsOptional()
  @IsString()
  masterBl: string;

  @IsOptional()
  @IsString()
  masterBlType: string;

  @IsOptional()
  @IsString()
  houseBl: string;

  @IsOptional()
  @IsString()
  houseBlType: string;

  @IsOptional()
  @IsString()
  terms: string;

  @IsOptional()
  @IsArray()
  // @ArrayMinSize(1)
  containerNumber: [];

  @IsOptional()
  @IsString()
  voyageName: string;

  @IsOptional()
  @IsString()
  voyageNumber: string;

  @IsOptional()
  @IsNumber()
  blFreightAmount: number;

  @IsOptional()
  @IsString()
  blFreightPayable: string;

  @IsOptional()
  @IsEnum(BL_INSURANCE, {
    message: ({ value }) =>
      `${value} must be one of a valid enum value (${Object.values(
        BL_INSURANCE,
      )})`,
  })
  blInsurance: string;

  @IsOptional()
  @IsNumber()
  blCountryId: number;

  @IsOptional()
  @IsNumber()
  blCityId: number;

  @IsOptional()
  @IsString()
  blTerms: string;

  @IsOptional()
  @IsString()
  blPrepaidType: string;

  @IsOptional()
  @IsString()
  blCollectType: string;

  @IsOptional()
  @IsEnum(BlTemplateType, {
    message: ({ value }) =>
      `${value} must be one of valid enum values (${Object.values(
        BlTemplateType,
      )})`,
  })
  blTemplateType: BlTemplateType;

  @IsOptional()
  @IsArray()
  blHistory: Array<{
    blType: string;
    userId: number;
    activity: string;
    dateTime: Date;
  }>;

  @IsOptional()
  @IsString()
  houseBlFile: string;

  @IsOptional()
  @IsString()
  blDocumentType: string;

  @IsOptional()
  @IsString()
  blBookingNumber: string;

  @IsOptional()
  @IsString()
  blReferences: string;

  @IsOptional()
  @IsString()
  blExportReferences: string;

  @IsOptional()
  @IsString()
  blShipperAddress: string;

  @IsOptional()
  @IsString()
  blConsigneeAddress: string;

  @IsOptional()
  @IsString()
  blNotifyPartyAddress: string;

  @IsOptional()
  @IsString()
  blDeliveryAgent: string;

  @IsOptional()
  @IsString()
  blExportVessel: string;

  @IsOptional()
  @IsString()
  blPlaceOfReceipt: string;

  @IsOptional()
  @IsString()
  blPlaceOfDelivery: string;

  @IsOptional()
  @IsString()
  blMarkAndNumber: string;

  @IsOptional()
  @IsString()
  blNumberOfBl: string;

  @IsOptional()
  @IsString()
  blDescOfGoods: string;

  @IsOptional()
  @IsString()
  blAsAgentFor: string;

  @IsOptional()
  @IsString()
  blReceiptDate: string;

  @IsOptional()
  @IsString()
  blDescOfRatesAndCharges: string;

  @IsOptional()
  @IsString()
  blNumberOfPackages: string;

  @IsOptional()
  @IsString()
  blPackagesUnit: string;

  @IsOptional()
  @IsString()
  blGrossWeight: string;

  @IsOptional()
  @IsString()
  blWeightUnit: string;

  @IsOptional()
  @IsString()
  blVolumetric: string;

  @IsOptional()
  @IsString()
  blVolumetricUnit: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateQuotationDto)
  quotation: UpdateQuotationDto;
}
