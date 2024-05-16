import {
    IsArray, IsNumber, IsNotEmpty, ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';
import {
    OcrConvertedDataDto
} from './ocr-doc-converted-data.dto';

export class OcrDocumentUpdateRequestDto {
    @IsNotEmpty()
    @IsNumber()
    numberOfPages: number;

    @IsNotEmpty()
    @IsArray()
    @ValidateNested()
    @Type(() => OcrConvertedDataDto)
    pages : OcrConvertedDataDto[];
}