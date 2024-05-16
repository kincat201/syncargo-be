import { Expose } from 'class-transformer';

export class UserDto {
  @Expose()
  userId: number;

  @Expose()
  fullName: string;

  @Expose()
  photo: string;

  @Expose()
  email: string;

  @Expose()
  phoneCode: string;

  @Expose()
  phoneNumber: string;

  @Expose()
  userStatus: string;

  @Expose()
  role: string;

  @Expose()
  customerId: string;

  @Expose()
  customerLogin: boolean;

  @Expose()
  lastLogin: Date;

  @Expose()
  createdAt: Date;
}
