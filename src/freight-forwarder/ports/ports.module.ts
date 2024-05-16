import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Port } from 'src/entities/port.entity';
import { PortsService } from './ports.service';

@Module({
  providers: [PortsService, Port],
  exports: [PortsService],
  imports: [TypeOrmModule.forFeature([Port])],
})
export class PortsModule {}
