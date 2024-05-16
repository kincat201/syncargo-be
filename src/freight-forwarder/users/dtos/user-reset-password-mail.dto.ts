import { IsEmail, IsString } from 'class-validator';

export class UserResetPasswordMailDto {
  @IsEmail()
  email: string;

  @IsString()
  subdomain: string;
}
