import { IsEmail, IsOptional } from 'class-validator';

export class ShareProformaDto {
  @IsEmail()
  @IsOptional()
  email: string;
}
