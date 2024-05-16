import { IsString, IsEmail, IsNumber } from 'class-validator';

export class UploadImageDto {
  @IsString()
  file: string

  @IsString()
  fileName: string

  @IsString()
  fileExt: string

  @IsString()
  fileSize: string

  @IsNumber()
  userId: string
}