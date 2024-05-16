import { IsNotEmpty, IsString } from 'class-validator';

export class UploadCeisaDto {
    @IsNotEmpty()
    @IsString()
    isFinal: boolean;

    @IsNotEmpty()
    @IsString()
    nomorAju: string;
}
