import {
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateJobSheetPayablePriceDto } from './create-job-sheet-payable-price.dto';

export class ReviseJobSheetPayableDto {

  @IsNotEmpty()
  @IsString()
  jobSheetNumber: string;

  @IsString()
  @IsOptional()
  invoiceNumber: string;

  @IsNotEmpty()
  @IsString()
  vendorName: string;

  @IsNotEmpty()
  @IsString()
  payableDate: string;

  @IsNotEmpty()
  @IsString()
  dueDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note: string;

  @IsOptional()
  @IsString()
  deletedFiles: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateJobSheetPayablePriceDto)
  prices: CreateJobSheetPayablePriceDto[];

}
