import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { TypeOfPayment } from 'src/enums/enum';
import { IsNotInclude } from 'src/freight-forwarder/decorators/is-not-include.decorator';
import { IsOnlyInclude } from 'src/freight-forwarder/decorators/is-only-include.decorator';

export class UpdateCustomerDto {
  @IsString()
  @IsOptional()
  @IsNotInclude('~!@#$%^&*+`,=[]{};:<>/?|"', {
    message: 'full name contains invalid characters',
  })
  fullName: string;

  @IsEmail()
  @IsOptional()
  email: string;

  @IsString()
  @IsOptional()
  @IsOnlyInclude('0123456789', {
    message: 'phone code only allows numbers',
  })
  phoneCode: string;

  @IsString()
  @IsOptional()
  @IsOnlyInclude('0123456789', {
    message: 'phone number only allows numbers',
  })
  phoneNumber: string;

  @IsString()
  @IsOptional()
  customerType: string;

  @IsString()
  @IsOptional()
  @Length(20, 20)
  @IsOnlyInclude('.-1234567890', {
    message: 'npwp only allows numbers, period, and dash',
  })
  npwp: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  address: string;

  @IsString()
  @IsOptional()
  companyName: string;

  @IsString()
  @IsIn(Object.values(TypeOfPayment))
  typeOfPayment: string;
}
