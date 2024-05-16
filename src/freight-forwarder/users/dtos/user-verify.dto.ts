import { IsString } from 'class-validator';

export class UserVerifyDto {
  @IsString()
  code: string;

  @IsString()
  subdomain: string;
}
