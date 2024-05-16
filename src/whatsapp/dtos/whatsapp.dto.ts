import { IsOptional, IsString } from "class-validator";

export class WhatsappDto {
    @IsString()
    phone: string;

    @IsString()
    @IsOptional()
    message: string;
}