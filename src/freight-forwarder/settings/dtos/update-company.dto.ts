import { IsString, IsEmail, Length, MaxLength } from 'class-validator';
import { IsNotInclude } from 'src/freight-forwarder/decorators/is-not-include.decorator';
import { IsOnlyInclude } from 'src/freight-forwarder/decorators/is-only-include.decorator';

export class UpdateCompanyDto {
  @IsNotInclude('~!@#$%^&*()_+`,=[]{};:<>/?|"\'', {
    message: 'company name contains invalid characters',
  })
  name: string;

  @IsString()
  @MaxLength(500)
  address: string;

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
  @Length(20, 20)
  @IsOnlyInclude('.-1234567890', {
    message: 'npwp only allows numbers, period, and dash',
  })
  npwp: string;
}
