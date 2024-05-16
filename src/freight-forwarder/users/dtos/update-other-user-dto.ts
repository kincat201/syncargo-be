import { Type } from 'class-transformer';
import {
  IsEmail,
  IsString,
  IsArray,
  ValidateNested,
  IsOptional,
  IsNumber,
  IsIn,
  IsBoolean,
} from 'class-validator';
import { MenuAccessDto } from './menu-access.dto';
import { IsOnlyInclude } from 'src/freight-forwarder/decorators/is-only-include.decorator';
import { Role } from 'src/enums/enum';

export class UpdateOtherUserDto {
  @IsNumber()
  userId: number;

  @IsString()
  @IsOptional()
  @IsOnlyInclude(' .abcdefghijklmnopqrstuvwxyz', {
    message: 'fullName only allows alphabet and period',
  })
  fullName: string;

  @IsString()
  @IsOptional()
  jobTitle: string;

  @IsIn([Role.ADMIN, Role.MANAGER, Role.STAFF])
  @IsOptional()
  role: string;

  @IsString()
  phoneCode: string;

  @IsString()
  phoneNumber: string;

  @IsBoolean()
  isActive: boolean;

  @IsArray()
  @IsOptional()
  @Type(() => MenuAccessDto)
  menuAccess: MenuAccessDto[];
}
