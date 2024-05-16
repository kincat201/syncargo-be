import { Type } from 'class-transformer';
import {
  IsEmail,
  IsString,
  IsArray,
  ValidateNested,
  IsOptional,
  IsIn,
} from 'class-validator';
import { MenuAccessDto } from './menu-access.dto';
import { IsOnlyInclude } from 'src/freight-forwarder/decorators/is-only-include.decorator';
import { Role } from 'src/enums/enum';

export class CreateUserDto {
  @IsString()
  @IsOnlyInclude(' .abcdefghijklmnopqrstuvwxyz', {
    message: 'fullName only allows alphabet and period',
  })
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  jobTitle: string;

  @IsIn([Role.ADMIN, Role.MANAGER, Role.STAFF])
  role: string;

  @IsArray()
  @IsOptional()
  @Type(() => MenuAccessDto)
  menuAccess: MenuAccessDto[];
}
