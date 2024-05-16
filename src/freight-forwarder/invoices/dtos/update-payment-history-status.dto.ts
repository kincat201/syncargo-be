import { IsString, IsOptional, IsIn } from 'class-validator';
import { PaymentHistoryPaymentStatus } from 'src/enums/enum';

export class UpdatePaymentHistoryStatusDto {
  @IsIn(Object.values(PaymentHistoryPaymentStatus))
  paymentStatus: PaymentHistoryPaymentStatus;

  @IsString()
  @IsOptional()
  rejectReason: string;
}
