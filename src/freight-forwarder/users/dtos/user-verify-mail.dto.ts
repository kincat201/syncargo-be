import { IsNumber, IsEmail, IsString } from 'class-validator';

export class UserVerifyMailDto {
  @IsEmail()
  email: string;

  @IsString()
  subdomain: string;
}
