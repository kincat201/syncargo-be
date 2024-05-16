import { IsString } from 'class-validator';

export class UserActivityDto {
  @IsString()
  menu: string;

  @IsString()
  action: string;
}
