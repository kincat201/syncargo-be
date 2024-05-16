import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PhoneCode } from 'src/entities/phone-code.entity';
import { PhoneCodesService } from './phone-codes.service';

@Module({
  imports: [TypeOrmModule.forFeature([PhoneCode])],
  providers: [PhoneCodesService],
  exports: [PhoneCodesService],
})
export class PhoneCodesModule {}
