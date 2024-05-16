import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Patch,
  HttpCode,
  Headers,
  UseInterceptors,
  UploadedFile,
  Param,
  Delete,
} from '@nestjs/common';

import * as crypto from 'crypto';
import { UsersService } from './users.service';
import { UserRegistDto } from './dtos/user-regist.dto';
import { JwtAuthGuard } from 'src/freight-forwarder/auth/jwt-auth.guard';
import { UserResetPasswordDto } from './dtos/user-reset-password.dto';
import { UserResetPasswordMailDto } from './dtos/user-reset-password-mail.dto';
import { CurrentUser } from '../decorators/current-user.decorator';
import { User } from 'src/entities/user.entity';
import { AuthGuard } from 'src/freight-forwarder/auth/auth.guard';
import { Serialize } from 'src/freight-forwarder/interceptors/serialize.interceptor';
import { UserDto } from './dtos/user.dto';
import { CurrentUserDto } from '../auth/dtos/current-user.dto';
import { IpAddress } from '../decorators/ip-address.decorator';
import { UserActivityDto } from './dtos/user-activity.dto';
import { ForgotPasswordActivityDto } from './dtos/forgot-password-activity.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ParseIntPipe } from '@nestjs/common';

@Controller('freight-forwarder/users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post('/activation-code')
  checkActivationCode(@Body() body: { code: string }) {
    return this.usersService.checkActivationCode(body.code);
  }

  @Serialize(UserDto)
  @Post()
  regist(@Body() body: UserRegistDto) {
    return this.usersService.create(body);
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Get()
  getMyProfile(@CurrentUser() user: User) {
    return this.usersService.findById(user.userId, user.companyId);
  }

  // @UseGuards(ThrottlerGuard)
  // @Throttle(1, 60)
  @Post('/password')
  @HttpCode(200)
  resetPasswordMail(@Body() body: UserResetPasswordMailDto) {
    return this.usersService.resetPasswordMail(body.email, body.subdomain);
  }

  @Post('/password/code')
  @HttpCode(200)
  checkResetPasswordCode(@Body() body: { code: string }) {
    return this.usersService.checkResetPasswordCode(body.code);
  }

  // @UseGuards(ThrottlerGuard)
  // @Throttle(1, 60)
  @Patch('/password')
  resetPassword(@Body() body: UserResetPasswordDto) {
    return this.usersService.resetPassword(body);
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Get('/sidebar-menu')
  async getSidebar(@CurrentUser() user: User) {
    try {
      return await this.usersService.getSidebar(user.userId);
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Post('/activity')
  createUsersActivity(
    @IpAddress() ip: string,
    @CurrentUser() user: CurrentUserDto,
    @Body() activity: UserActivityDto,
    @Headers('Authorization') authorization: string,
  ) {
    const token = authorization.split(' ')[1];
    return this.usersService.addUserActivity(ip, user, activity, token);
  }

  @Post('/activity/forgot-password')
  createForgotUserActivity(
    @IpAddress() ip: string,
    @Body() activity: ForgotPasswordActivityDto,
  ) {
    return this.usersService.addForgotPasswordActivity(ip, activity);
  }

  @Post('/company/:id/upload-approved-hbl')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 1048576 * 5 } }),
  )
  async uploadApprovedHbl(
    @UploadedFile() file: Express.Multer.File,
    @Param('id', ParseIntPipe) companyId: number,
  ) {
    try {
      const fileNameSplit = file.originalname.split('.');
      const fileExt = fileNameSplit[fileNameSplit.length - 1];
      const fileName = `${crypto.randomBytes(32).toString('hex')}.${fileExt}`;

      const uploadData = {
        fileName,
        mimeType: file.mimetype,
        buffer: file.buffer,
      };

      return await this.usersService.updateApprovedHbl(companyId, uploadData);
    } catch (err) {
      return err;
    }
  }

  @Delete('/company/:id/remove-approved-hbl')
  async removeApprovedBl(
    @Param('id', ParseIntPipe) companyId: number,
  ) {
    try {
      return await this.usersService.removeApprovedHbl(companyId);
    } catch (err) {
      return err;
    }
  }
}
