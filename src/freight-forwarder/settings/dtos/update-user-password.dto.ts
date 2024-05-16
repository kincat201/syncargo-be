import { IsString, MinLength, Matches } from 'class-validator';
import { IsNoSpace } from 'src/freight-forwarder/decorators/no-space-password-validator.decorator';

export class UpdateUserPasswordDto {
  @IsString()
  @MinLength(8)
  @IsNoSpace(' ', {
    message: 'password must not include space',
  })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.{8,})/, {
    message: 'password is too weak',
  })
  password: string;
}
