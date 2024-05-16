/* eslint-disable prettier/prettier */
import { IsString } from 'class-validator';

export class UploadMblDto {
    @IsString()
    masterBlType: string;

    @IsString()
    masterBlNumber: string;
}
