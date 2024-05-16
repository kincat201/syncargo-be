import { IsIn, IsNumber, IsOptional, Max } from 'class-validator';
import {
  ContainerOption,
  ContainerType,
  FclType,
  PackagingType,
  UomSeaBreakbulk,
} from 'src/enums/enum';

export class PackingListDto {
  @IsOptional()
  @IsNumber()
  packageQty: number;

  @IsOptional()
  @IsIn(Object.values(PackagingType))
  packagingType: PackagingType;

  @IsNumber()
  weight: number;

  @IsOptional()
  @IsNumber()
  length: number;

  @IsOptional()
  @IsNumber()
  width: number;

  @IsOptional()
  @IsNumber()
  height: number;

  @IsOptional()
  @IsNumber()
  qty: number;

  @IsOptional()
  @IsIn(Object.values(UomSeaBreakbulk))
  uom: UomSeaBreakbulk;

  @IsOptional()
  @IsIn(Object.values(FclType))
  fclType: FclType;

  @IsOptional()
  @IsIn(Object.values(ContainerOption))
  containerOption: ContainerOption;

  @IsOptional()
  @IsIn(Object.values(ContainerType))
  containerType: ContainerType;

  @IsOptional()
  @IsNumber()
  @Max(100)
  temperature: number;
}
