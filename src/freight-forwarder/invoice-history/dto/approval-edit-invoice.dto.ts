import { IsString, IsOptional, IsIn } from 'class-validator';
import { InvoiceHistoryStatusApproval, JobSheetPayableStatus } from 'src/enums/enum';

export class ApprovalEditInvoiceDto {
  @IsIn([InvoiceHistoryStatusApproval.APPROVED,InvoiceHistoryStatusApproval.REJECTED])
  action: InvoiceHistoryStatusApproval;

  @IsString()
  @IsOptional()
  rejectReason: string;
}
