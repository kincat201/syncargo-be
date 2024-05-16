import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FclType } from 'src/entities/fcl-type.entity';
import { FclTypesService } from './fcl-types.service';

@Module({
  imports: [TypeOrmModule.forFeature([FclType])],
  providers: [FclTypesService],
  exports: [FclTypesService],
})
export class FclTypesModule {}
