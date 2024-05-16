import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'm_phone_codes' })
export class PhoneCode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    nullable: true,
  })
  code: string;

  @Column({
    name: 'country_name',
  })
  countryName: string;

  @Column({
    name: 'country_code',
  })
  countryCode: string;

}
