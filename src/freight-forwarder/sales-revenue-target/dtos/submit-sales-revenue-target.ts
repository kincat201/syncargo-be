import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
export class SubmitSalesRevenueTarget {
  @IsNumber()
  @IsNotEmpty()
  revenueTarget: number;

  @IsString()
  @IsNotEmpty()
  period: string;
}
