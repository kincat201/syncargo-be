import {
  Body,
  Controller,
  HttpCode,
  Post,
  Delete,
  UseGuards, Get,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { LoginDto, NleLoginDto } from './dtos/user-login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthGuard } from './auth.guard';
import { CurrentUser } from 'src/freight-forwarder/decorators/current-user.decorator';
import { CurrentUserDto } from './dtos/current-user.dto';
import { IpAddress } from '../decorators/ip-address.decorator';
import { NleService } from '../nle/nle.service';

@Controller('freight-forwarder/auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private nleService: NleService,
  ) {}

  // @UseGuards(ThrottlerGuard)
  // @Throttle(3, 60)
  @Post('/login')
  @HttpCode(200)
  async login(@IpAddress() ip: string, @Body() body: LoginDto) {
    return await this.authService.login(
      body.subdomain,
      body.email,
      body.password,
      ip,
    );
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Delete('/logout')
  @HttpCode(200)
  async logout(@IpAddress() ip: string, @CurrentUser() user: CurrentUserDto) {
    return await this.authService.logout(user, ip);
  }

  @Get('/nle-token')
  async getTokenNle() {
    return await this.nleService.requestToken();
  }

  // @UseGuards(ThrottlerGuard)
  // @Throttle(3, 60)
  @UseGuards(AuthGuard, JwtAuthGuard)
  @Post('/nle-login')
  @HttpCode(200)
  async nleLogin(@Body() body: NleLoginDto, @CurrentUser() user: CurrentUserDto) {
    const getUserInfo = await this.nleService.getUserInfo(body.accessToken);
    return this.authService.loginNle(body.accessToken, getUserInfo, user);
  }
}
