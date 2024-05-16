import {
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RemittancePaymentJobSheetPayableDto } from './remittance-payment-job-sheet-payable.dto';

export class RemittanceJobSheetPayableDto {

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RemittancePaymentJobSheetPayableDto)
  payments: RemittancePaymentJobSheetPayableDto[];

}
