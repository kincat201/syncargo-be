import { IsString, IsOptional, IsIn } from 'class-validator';
import { JobSheetPayableStatus } from 'src/enums/enum';

export class ApprovalJobSheetPayableDto {
  @IsIn([JobSheetPayableStatus.APPROVED,JobSheetPayableStatus.REJECTED,JobSheetPayableStatus.PAID])
  action: JobSheetPayableStatus;

  @IsString()
  @IsOptional()
  rejectReason: string;
}
