import { ArrayMinSize, IsArray } from 'class-validator';

export class DeleteJobSheetDto {
  @IsArray()
  @ArrayMinSize(1)
  jobSheetNumber: any;
}
