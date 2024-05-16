import {
    Body,
    Controller,
    Post,
    Get,
    Delete,
    UploadedFile,
    UseGuards,
    UseInterceptors,
    Param,
    Query,
    Put,
    Res,
    NotFoundException,
    ParseIntPipe,
} from '@nestjs/common';


import { OcrService } from './ocr.service';
import { AuthGuard } from '../auth/auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../decorators/current-user.decorator';
import { CurrentUserDto } from '../auth/dtos/current-user.dto';
import { S3Service } from '../../s3/s3.service';
import { Response } from 'express';
import { OcrDocumentUpdateRequestDto } from './dtos/ocr-doc-update.dto';
import { StreamableFile } from '@nestjs/common';
import * as fs from 'fs';
import * as tmp from 'tmp-promise';


@UseGuards(AuthGuard, JwtAuthGuard)
@Controller('freight-forwarder/ocr')
export class OcrController {
    constructor(
        private ocrService : OcrService,
        private s3Service :  S3Service,
    ){}

    @Post("/document")
    @UseInterceptors(
        FileInterceptor('file', { limits: { fileSize: 1048576 * 5 } }), // Max file size 5MB
    )
    async uploadOcrDocument(
        @UploadedFile() file: Express.Multer.File,
        @CurrentUser() user: CurrentUserDto,
    ) : Promise<any> {
        return await this.ocrService.uploadOcrDocument(user, file);
    }

    @Get("/document/drafted")
    async getOcrDocumentCurrent(
        @CurrentUser() user: CurrentUserDto,
    ) : Promise<any>{
        return await this.ocrService.getOcrDocumentCurrent(user);
    }
    
    @Get("/document/:id")
    async getOcrDocument(
        @CurrentUser() user: CurrentUserDto,
        @Param('id', ParseIntPipe) id: number,
    ) : Promise<any>{
        return await this.ocrService.getOcrDocumentDetail(user, id);
    }

    @Delete("/document/:id")
    async deleteOcrDocument(
        @CurrentUser() user: CurrentUserDto,
        @Param('id', ParseIntPipe) id: number,
    ) : Promise<any>{
        return await this.ocrService.deleteOcrDocument(user, id);
    }

    @Get("/document")
    async getAllOcrDocument(
        @CurrentUser() user: CurrentUserDto,
    ) : Promise<any>{
        return await this.ocrService.getAllOcrDocument(user);
    }

    @Get("/document/download/:id")
    async downloadOcrToDoc(
        @CurrentUser() user: CurrentUserDto,
        @Param('id', ParseIntPipe) id: number,
    ) : Promise<any>{
      return await this.ocrService.downloadOcrToDoc(user, id);
    }

    @Put("/document/:id")
    async updateOcrDocument(
        @CurrentUser() user: CurrentUserDto,
        @Param('id', ParseIntPipe) id: number,
        @Body() body : OcrDocumentUpdateRequestDto,
    ) : Promise<any>{
        return this.ocrService.updateOcrDocument(user, id, body);
    }

    @Get("document/convert/:id")
    async convertOcrDocument(
        @CurrentUser() user: CurrentUserDto,
        @Param('id', ParseIntPipe) id: number,
    ) : Promise<any> {
        return this.ocrService.convertOcrDocument(user, id);
    }
}