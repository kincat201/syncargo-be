import {
  Body,
  Controller, Get, Post, Query,
  UseGuards, UseInterceptors,
  Res, Put, UploadedFile, Param, BadRequestException,
} from '@nestjs/common';

import { AuthGuard } from 'src/freight-forwarder/auth/auth.guard';
import { JwtAuthGuard } from 'src/freight-forwarder/auth/jwt-auth.guard';

import { CurrentUser } from 'src/freight-forwarder/decorators/current-user.decorator';

import { CurrentUserDto } from '../auth/dtos/current-user.dto';
import { HblDynamicService } from './hbl-dynamic.service';
import { CustomerModuleInterceptor } from '../interceptors/customer-module.interceptor';
import { SaveHblDynamicDto } from './dtos/save-hbl-dynamic.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { SettleInvoiceDto } from '../invoices/dtos/settle-invoice.dto';
import * as crypto from "crypto";
import { TransformRfqNumberPipe } from '../pipes/transform-rfq-number.pipe';

@UseGuards(AuthGuard, JwtAuthGuard)
@Controller('freight-forwarder/hbl-dynamic')
export class HblDynamicController {
  constructor(
    private hblDynamicService: HblDynamicService,
  ) {}

  @Get('detail')
  async getDetail(
    @CurrentUser() user: CurrentUserDto,
    @Query('rfqNumber',new TransformRfqNumberPipe()) rfqNumber: string,
    @Query('isReset') isReset: boolean,
    @Res({ passthrough: true }) res: any,
  ) {
    res.set({
      'Content-Type': 'application/json',
    });
    return await this.hblDynamicService.getHblDynamic(user,rfqNumber, isReset);
  }

  @Post('/save')
  async save(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: SaveHblDynamicDto,
  ) {
    return await this.hblDynamicService.saveHblDynamic(user, body);
  }

  @Put('/upload')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 1048576 * 10 } }),
  )
  async uploadImage(
    @CurrentUser() user: CurrentUserDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      if (!file) {
        throw new BadRequestException('Please select file picture');
      }

      const mimeTypes = [
        'image/jpeg', // .jpg and .jpeg
        'image/png', //png
        ,
      ];
      if (!mimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          'Only allows upload png, jpg, or jpeg extention',
        );
      }

      const fileExt = '.' + file.originalname.split('.').pop();
      const hashedFileName = `${crypto
        .randomBytes(32)
        .toString('hex')}${fileExt}`;
      const upload = {
        file,
        fileExt,
        hashedFileName,
      };

      return await this.hblDynamicService.uploadFile(
        upload,
        user,
      );

    } catch (error) {
      throw error;
    }
  }
}
