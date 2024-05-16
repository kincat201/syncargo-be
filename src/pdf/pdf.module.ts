import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PdfService } from './pdf.service';
import { User } from 'src/entities/user.entity';
import { Helper } from 'src/freight-forwarder/helpers/helper';
import { HttpModule } from '@nestjs/axios';
@Module({
  imports: [TypeOrmModule.forFeature([User]), ConfigModule, HttpModule],
  providers: [PdfService, Helper],
  exports: [PdfService],
})
export class PdfModule {}
