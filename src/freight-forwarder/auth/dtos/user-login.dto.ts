import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  subdomain: string;
}

export class NleLoginDto {

  @IsString()
  accessToken: string;

}