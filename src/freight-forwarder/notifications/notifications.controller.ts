import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUserDto } from '../auth/dtos/current-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@UseGuards(AuthGuard, JwtAuthGuard)
@Controller('freight-forwarder/notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get('/:type/:page/:perpage')
  async getPaged(
    @CurrentUser() user: CurrentUserDto,
    @Param('type') type: string,
    @Param('page', ParseIntPipe) page: number,
    @Param('perpage', ParseIntPipe) perpage: number,
    @Query('isRead') isRead: string,
  ) {
    try {
      return await this.notificationsService.getPaged(
        user.companyId,
        user.userId,
        type,
        page,
        perpage,
        isRead,
      );
    } catch (error) {
      return error;
    }
  }

  @Patch()
  async unReadOne(
    @CurrentUser() user: CurrentUserDto,
    @Query('id') id: string,
  ) {
    try {
      return await this.notificationsService.unReadOne(
        user.companyId,
        user.userId,
        id,
      );
    } catch (error) {
      return error;
    }
  }

  @Patch('/:type/:page/:perpage')
  async readMany(
    @CurrentUser() user: CurrentUserDto,
    @Param('type') type: string,
    @Param('page', ParseIntPipe) page: number,
    @Param('perpage', ParseIntPipe) perpage: number,
    @Query('isRead') isRead: string,
  ) {
    try {
      return await this.notificationsService.readMany(
        user.companyId,
        user.userId,
        type,
        page,
        perpage,
        isRead,
      );
    } catch (error) {
      return error;
    }
  }
}
