import {
    IsString, IsNumber
} from 'class-validator';

export class OcrConvertedDataDto {
    @IsNumber()
    page : number;

    @IsString()
    lines : string;
}

