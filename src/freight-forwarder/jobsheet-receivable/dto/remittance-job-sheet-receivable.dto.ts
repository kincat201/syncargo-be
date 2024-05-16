import {
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RemittanceReceivableJobSheetReceivableDto } from './remittance-receivable-job-sheet-receivable.dto';

export class RemittanceJobSheetReceivableDto {

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RemittanceReceivableJobSheetReceivableDto)
  payments: RemittanceReceivableJobSheetReceivableDto[];

}
