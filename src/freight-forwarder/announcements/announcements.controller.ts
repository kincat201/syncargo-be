import { Controller, Get, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { AnnouncementsService } from './announcements.service';

@UseGuards(AuthGuard, JwtAuthGuard)
@Controller('freight-forwarder/announcements')
export class AnnouncementsController {
  constructor(private announcementsService: AnnouncementsService) {}

  @Get()
  async getOne() {
    return await this.announcementsService.getOne();
  }
}
