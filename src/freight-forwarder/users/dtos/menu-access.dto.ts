import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNumber, IsString } from 'class-validator';

export class MenuAccessDto {
  @IsNumber()
  id: number;

  @IsString()
  menu_name: string;

  @IsBoolean()
  permission: boolean;

  @IsArray()
  @Type(() => MenuAccessDto)
  children: MenuAccessDto[];

  @IsNumber()
  position: number;
}
