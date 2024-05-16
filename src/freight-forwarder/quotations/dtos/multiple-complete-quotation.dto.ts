import { ArrayMinSize, IsArray } from 'class-validator';

export class MultipleCompleteQuotationDto {
  @IsArray()
  @ArrayMinSize(1)
  rfqNumber: [];
}
