import { IsIn, IsNotEmpty, IsOptional } from 'class-validator';
import { JobSheetItemType } from '../../../enums/enum';

export class CreateUpdateJobSheetDto {

  @IsOptional()
  rfqNumber: string;

  @IsOptional()
  customerId: string;

  @IsNotEmpty()
  @IsIn(Object.values(JobSheetItemType))
  itemType: string;

}
