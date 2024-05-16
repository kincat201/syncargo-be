import { IsEmail, IsString, MinLength, Matches } from 'class-validator';
import { IsNotInclude } from 'src/freight-forwarder/decorators/is-not-include.decorator';
import { IsOnlyInclude } from 'src/freight-forwarder/decorators/is-only-include.decorator';
import { IsNoSpace } from '../../decorators/no-space-password-validator.decorator';

export class UserRegistDto {
  @IsString()
  @IsNotInclude('~!@#$%^&*+`,=[]{};:<>/?|"', {
    message: 'full name contains invalid characters',
  })
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @IsNoSpace(' ', {
    message: 'password must not include space',
  })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.{8,})/, {
    message: 'password is too weak',
  })
  password: string;

  @IsString()
  @IsOnlyInclude('0123456789', {
    message: 'phone code only allows numbers',
  })
  phoneCode: string;

  @IsString()
  @IsOnlyInclude('0123456789', {
    message: 'phone code only allows numbers',
  })
  phoneNumber: string;

  @IsString()
  @IsNotInclude('~!@#$%^&*()_+`,=[]{};:<>/?|"\'', {
    message: 'company name contains invalid characters',
  })
  companyName: string;
}
