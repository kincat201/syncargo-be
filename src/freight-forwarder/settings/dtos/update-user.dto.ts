import { IsString, IsEmail, IsOptional, IsIn } from 'class-validator';
import { IsNotInclude } from 'src/freight-forwarder/decorators/is-not-include.decorator';
import { IsOnlyInclude } from 'src/freight-forwarder/decorators/is-only-include.decorator';
import { Role } from 'src/enums/enum';

export class UpdateUserDto {
  @IsOptional()
  @IsNotInclude('~!@#$%^&*+`,=[]{};:<>/?|"', {
    message: 'full name contains invalid characters',
  })
  fullName: string;

  @IsOptional()
  @IsString()
  @IsOnlyInclude('0123456789', {
    message: 'phone code only allows numbers',
  })
  phoneCode: string;

  @IsOptional()
  @IsString()
  @IsOnlyInclude('0123456789', {
    message: 'phone code only allows numbers',
  })
  phoneNumber: string;

  @IsOptional()
  @IsString()
  photo: string;
}
