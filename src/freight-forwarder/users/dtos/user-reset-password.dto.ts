import { IsString, MinLength, Matches, IsOptional } from 'class-validator';
import { IsNoSpace } from '../../decorators/no-space-password-validator.decorator';

export class UserResetPasswordDto {
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
  code: string;

  @IsString()
  subdomain: string;

  @IsString()
  @IsOptional()
  phoneCode: string;

  @IsString()
  @IsOptional()
  phoneNumber: string;
}
