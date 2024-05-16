import { IsString, IsOptional, IsIn } from 'class-validator';
import { JobSheetReceivableStatus } from 'src/enums/enum';

export class ApprovalJobSheetReceivableDto {
  @IsIn([JobSheetReceivableStatus.APPROVED,JobSheetReceivableStatus.ISSUED,JobSheetReceivableStatus.REJECTED])
  action: JobSheetReceivableStatus;

  @IsString()
  @IsOptional()
  rejectReason: string;

  @IsString()
  @IsOptional()
  email: string;

}
