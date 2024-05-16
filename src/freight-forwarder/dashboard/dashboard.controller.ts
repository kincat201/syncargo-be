import {
  BadRequestException, Body,
  Controller,
  Get,
  Param,
  ParseIntPipe, Post,
  Query,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';

import { AuthGuard } from 'src/freight-forwarder/auth/auth.guard';
import { JwtAuthGuard } from 'src/freight-forwarder/auth/jwt-auth.guard';

import { CurrentUser } from 'src/freight-forwarder/decorators/current-user.decorator';

import { DashboardService } from './dashboard.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CurrentUserDto } from '../auth/dtos/current-user.dto';
import { Features } from 'src/enums/enum';
import { SalesRevenueTargetService } from '../sales-revenue-target/sales-revenue-target.service';
import { SubmitSalesRevenueTarget } from '../sales-revenue-target/dtos/submit-sales-revenue-target';

@UseGuards(AuthGuard, JwtAuthGuard)
@Controller('freight-forwarder/dashboard')
export class DashboardController {
  constructor(
    private dashboardService: DashboardService,
    private notificationsService: NotificationsService,
    private salesRevenueTargetService: SalesRevenueTargetService,
  ) {}

  @Get('/summary/:activity')
  async downloadSummary(
    @Res() response: Response,
    @CurrentUser() user: CurrentUserDto,
    @Param('activity') activity: string,
    @Query('date') date: string,
    @Query('isFinance') isFinance: boolean,
  ) {
    let excelFile: string;
    let features = user.companyFeatureIds;
    if (
      activity === 'quotation' &&
      (features.includes(Features.ALL_FEATURES) || features.includes(Features.CRM))
    ) {
      // only all feature and CRM allowed
      excelFile = await this.dashboardService.getQuotationSummary(user, date);
    } else if (
      activity === 'shipment' &&
      (features.includes(Features.ALL_FEATURES) || features.includes(Features.TMS))
    ) {
      excelFile = await this.dashboardService.getShipmentSummary(user, date);
    } else if (
      activity === 'issued-invoice' &&
      (features.includes(Features.ALL_FEATURES) || features.includes(Features.FINANCE))
    ) {
      excelFile = await this.dashboardService.getIssuedInvoiceSummary(
        user,
        date,
        isFinance,
      );
    } else if (
      activity === 'settled-invoice' &&
      (features.includes(Features.ALL_FEATURES) || features.includes(Features.FINANCE))
    ) {
      excelFile = await this.dashboardService.getSettledInvoiceSummary(
        user,
        date,
        isFinance,
      );
    } else if (
      activity === 'profit-loss' &&
      (features.includes(Features.ALL_FEATURES) || features.includes(Features.FINANCE))
    ) {
      excelFile = await this.dashboardService.getProfitLossSummary(
        user,
        date,
      );
    } else {
      throw new BadRequestException();
    }

    response.set({ 'Content-Type': 'text/xlsx' });
    response.download(excelFile);
  }

  @Get('/snapshot')
  async getSnapshot(
    @CurrentUser() currentUser: CurrentUserDto,
    @Query('limit') limit: number,
  ) {
    return await this.dashboardService.getSnapshot(currentUser, limit);
  }

  @Get('/shipment-calendar/:view/:page')
  async getShipmentCalendar(
    @CurrentUser() currentUser: CurrentUserDto,
    @Param('view') view: string,
    @Param('page', ParseIntPipe) page: number,
    @Query('date') date: string,
    @Query('weekNumber') weekNumber: string,
  ) {
    if (
      !currentUser.companyFeatureIds.includes(Features.ALL_FEATURES) &&
      !currentUser.companyFeatureIds.includes(Features.TMS)
    )
      return new UnauthorizedException('Feature not allowed');

    if (!['etd', 'eta'].includes(view)) {
      throw new BadRequestException();
    }
    return await this.dashboardService.getShipmentCalendar(
      currentUser,
      view,
      weekNumber,
      page,
      date,
    );
  }

  @Get('/notifications/total')
  async getTotalUnreadNotification(@CurrentUser() user: CurrentUserDto) {
    return await this.notificationsService.countTotalUnread(
      user.companyId,
      user.userId,
    );
  }

  @Get('/job-sheets/list')
  async getJobSheetList(@CurrentUser() user: CurrentUserDto) {
    return await this.dashboardService.getJobSheetList(
      user
    );
  }

  @Get('/quotation-report/all-stage-report')
  async getAllStageReport(
    @CurrentUser() user: CurrentUserDto,
    @Query('date') date: string,
  ) {
    return await this.dashboardService.getAllStageReport(user,date);
  }

  @Get('/quotation-report/revenue-report')
  async getRevenueReport(
    @CurrentUser() user: CurrentUserDto,
    @Query('date') date: string,
  ) {
    return await this.dashboardService.getRevenueReport(user,date);
  }

  @Get('/quotation-report/pipeline')
  async getPipeLine(
    @CurrentUser() user: CurrentUserDto,
    @Query('date') date: string,
    @Query('salesId') salesId: number,
  ) {
    return await this.dashboardService.getPipeLine(user,date,salesId);
  }

  @Get('/quotation-report/get-revenue-target-history/:date')
  async getRevenueTarget(
    @CurrentUser() user: CurrentUserDto,
    @Param('date') date: string,
    @Query('salesId') salesId: number,
  ) {
    return await this.salesRevenueTargetService.getRevenueTargetHistory(salesId,date,user);
  }

  @Post('/quotation-report/set-revenue-target/:salesId')
  async setRevenueTarget(
    @CurrentUser() user: CurrentUserDto,
    @Param('salesId', ParseIntPipe) salesId: number,
    @Body() body: SubmitSalesRevenueTarget,
  ) {
    return await this.salesRevenueTargetService.submit(salesId,body,user);
  }
}
