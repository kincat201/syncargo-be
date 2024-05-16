import { IsString } from 'class-validator';

export class NleUserInfoDto {
  @IsString()
  name: string;

  @IsString()
  email: string;

  @IsString()
  identitas: string;
}
