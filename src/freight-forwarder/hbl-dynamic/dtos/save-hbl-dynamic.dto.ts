import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class SaveHblDynamicDto {

  @IsOptional()
  @IsString()
  rfqNumber: string;

  @IsOptional()
  @IsBoolean()
  hblDynamicDefault: boolean;

  @IsOptional()
  content: any;

}
