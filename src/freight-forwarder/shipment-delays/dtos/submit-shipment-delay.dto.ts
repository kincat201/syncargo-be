import { IsString, IsIn, IsDateString, IsOptional, IsArray } from 'class-validator';
import { OngoingOtif } from 'src/enums/enum';

export class SubmitShipmentDelayDto {
  @IsIn(Object.values(OngoingOtif))
  otifStatus: OngoingOtif;

  @IsDateString()
  delayDate: string;

  @IsDateString()
  estimatedDelayUntil: string;

  @IsString()
  note: string;

  @IsOptional()
  @IsArray()
  deletedFiles: any;

}
