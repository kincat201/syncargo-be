import { IsEmail, IsString } from 'class-validator';

export class ForgotPasswordActivityDto {
  @IsEmail()
  @IsString()
  email: string;
}
