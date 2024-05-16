import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from 'src/entities/company.entity';
import { User } from 'src/entities/user.entity';
import { CustomersService } from './customers.service';
import { Customer } from 'src/entities/customer.entity';
import { MailModule } from 'src/mail/mail.module';
import { Crypto } from 'src/utilities/crypto';
import { CustomerNle } from '../../entities/customer-nle.entity';

@Module({
  providers: [CustomersService, Crypto],
  exports: [CustomersService],
  imports: [
    TypeOrmModule.forFeature([User, Company, Customer, CustomerNle]),
    MailModule,
  ],
})
export class CustomersModule {}
