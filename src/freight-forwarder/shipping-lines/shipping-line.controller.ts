import { Controller, UseGuards, Get, Query, Body, Post } from '@nestjs/common';

import { ShippingLineService } from '../shipping-lines/shipping-line.service';
import { AuthGuard } from '../auth/auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetScheduleDto } from './dtos/get-schedule.dto';
import { CurrentUser } from '../decorators/current-user.decorator';
import { CurrentUserDto } from '../auth/dtos/current-user.dto';

@UseGuards(AuthGuard, JwtAuthGuard)
@Controller('freight-forwarder/shipping-line')
export class ShippingLineController {
  constructor(private shippingLineService: ShippingLineService) {}

  @Get('/get-port')
  async getPort(@Query('name') name: string) {
    return await this.shippingLineService.searchPort(name);
  }

  @Post('/get-schedule')
  async getSchedule(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: GetScheduleDto,
  ) {
    return await this.shippingLineService.searchSchedule(user, body);
  }
}
