import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PackagingType } from 'src/entities/packaging-type.entity';
import { PackagingTypesService } from './packaging-types.service';

@Module({
  imports: [TypeOrmModule.forFeature([PackagingType])],
  providers: [PackagingTypesService],
  exports: [PackagingTypesService],
})
export class PackagingTypesModule {}
