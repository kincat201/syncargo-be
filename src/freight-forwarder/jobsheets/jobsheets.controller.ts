import {
  BadRequestException,
  Body,
  Controller, Delete,
  Get,
  Param,
  ParseIntPipe, Patch, Post, Put,
  Query, UploadedFile, UploadedFiles,
  UseGuards, UseInterceptors,
} from '@nestjs/common';

import { AuthGuard } from 'src/freight-forwarder/auth/auth.guard';
import { JwtAuthGuard } from 'src/freight-forwarder/auth/jwt-auth.guard';

import { CurrentUser } from 'src/freight-forwarder/decorators/current-user.decorator';

import {
  JobSheetItemType
} from 'src/enums/enum';

import { JobSheetService } from './jobsheets.service';

import { CurrentUserDto } from '../auth/dtos/current-user.dto';
import { TransformJobSheetNumberPipe } from '../pipes/transform-job-sheet-number.pipe';
import { CreateUpdateJobSheetDto } from './dto/create-update-job-sheet.dto';
import { DeleteJobSheetDto } from './dto/delete-job-sheet.dto';
import { CreateJobSheetPayableDto } from '../jobsheet-payables/dto/create-job-sheet-payable.dto';
import { JobSheetPayableService } from '../jobsheet-payables/jobsheet-payable-service';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApprovalJobSheetPayableDto } from '../jobsheet-payables/dto/approval-job-sheet-payable.dto';
import { ReviseJobSheetPayableDto } from '../jobsheet-payables/dto/revise-job-sheet-payable.dto';
import { SubmitPaymentJobSheetPayableDto } from '../jobsheet-payables/dto/submit-payment-job-sheet-payable.dto';
import { RemittanceJobSheetPayableDto } from '../jobsheet-payables/dto/remittance-job-sheet-payable.dto';
import { CreateUpdateJobSheetPnlDto } from './dto/create-update-job-sheet-pnl.dto';
import { JobsheetReceivableService } from '../jobsheet-receivable/jobsheet-receivable.service';
import { CreateJobSheetReceivableDto } from '../jobsheet-receivable/dto/create-job-sheet-receivable.dto';
import { ApprovalJobSheetReceivableDto } from '../jobsheet-receivable/dto/approval-job-sheet-receivable.dto';
import { ReviseJobSheetReceivableDto } from '../jobsheet-receivable/dto/revise-job-sheet-receivable.dto';
import { SaveJobSheetShipmentDto } from './dto/save-job-sheet-shipment.dto';
import { SubmitPaymentJobSheetReceivableDto } from '../jobsheet-receivable/dto/submit-payment-job-sheet-receivable.dto';
import { RemittanceJobSheetReceivableDto } from '../jobsheet-receivable/dto/remittance-job-sheet-receivable.dto';


@UseGuards(AuthGuard, JwtAuthGuard)
@Controller('freight-forwarder/job-sheets')
export class JobSheetController {
  constructor(
    private jobSheetService: JobSheetService,
    private jobSheetPayableService: JobSheetPayableService,
    private jobSheetReceivableService: JobsheetReceivableService,
  ) {}

  @Get('/:page/:perpage')
  async getPaged(
    @Param('page', ParseIntPipe) page: number,
    @Param('perpage', ParseIntPipe) perpage: number,
    @Query('itemType') itemType: JobSheetItemType,
    @Query('jobSheetStatus') jobSheetStatus: string,
    @Query('createdAt') createdAt: string,
    @Query('search') search: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return await this.jobSheetService.getPaged(
      page,
      perpage,
      itemType,
      jobSheetStatus,
      createdAt,
      search,
      user,
    );
  }

  @Get('/:jobSheetNumber')
  async getDetail(
    @CurrentUser() user: CurrentUserDto,
    @Param('jobSheetNumber', new TransformJobSheetNumberPipe()) jobSheetNumber: string,
  ) {
    return await this.jobSheetService.getDetail(user, jobSheetNumber );
  }

  @Post()
  async create(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: CreateUpdateJobSheetDto,
  ) {
    return await this.jobSheetService.create(user, body);
  }

  @Put('/:jobSheetNumber')
  async update(
    @CurrentUser() user: CurrentUserDto,
    @Param('jobSheetNumber', new TransformJobSheetNumberPipe()) jobSheetNumber: string,
    @Body() body: CreateUpdateJobSheetDto,
  ) {
    return await this.jobSheetService.update(user, jobSheetNumber, body);
  }

  @Delete('/')
  async delete(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: DeleteJobSheetDto,
  ) {
    return await this.jobSheetService.delete(user, body);
  }

  @Post('/payable')
  @UseInterceptors(
    FilesInterceptor('files', 10, { limits: { fileSize: 1048576 * 5 } }),
  )
  async createPayable(
    @CurrentUser() user: CurrentUserDto,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Body() body: CreateJobSheetPayableDto,
  ) {
    return await this.jobSheetPayableService.create(user, body, files);
  }

  @Get('/payable/detail/:jobSheetPayableId')
  async getDetailPayable(
    @CurrentUser() user: CurrentUserDto,
    @Param('jobSheetPayableId') jobSheetPayableId: number,
  ) {
    return await this.jobSheetPayableService.getDetail(user, jobSheetPayableId );
  }

  @Put('/payable/approval/:jobSheetPayableId')
  async approvalPayable(
    @CurrentUser() user: CurrentUserDto,
    @Param('jobSheetPayableId') jobSheetPayableId: number,
    @Body() body: ApprovalJobSheetPayableDto,
  ) {
    return await this.jobSheetPayableService.approval(user, jobSheetPayableId, body );
  }

  @Patch('/payable/revise/:jobSheetPayableId')
  @UseInterceptors(
    FilesInterceptor('files', 10, { limits: { fileSize: 1048576 * 5 } }),
  )
  async revisePayable(
    @CurrentUser() user: CurrentUserDto,
    @Param('jobSheetPayableId') jobSheetPayableId: number,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Body() body: ReviseJobSheetPayableDto,
  ) {
    return await this.jobSheetPayableService.revise(user,jobSheetPayableId, body, files);
  }

  @Put('/payable/payment/:jobSheetPayableId')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 1048576 * 10 } }),
  )
  async paymentPayable(
    @CurrentUser() user: CurrentUserDto,
    @Param('jobSheetPayableId') jobSheetPayableId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: SubmitPaymentJobSheetPayableDto,
  ) {
    /*if (!file) {
      throw new BadRequestException('Please attach proof of payment');
    }*/
    return await this.jobSheetPayableService.payment(user,jobSheetPayableId, body, file);
  }

  @Delete('/payable/payment/:jobSheetPayableId')
  async paymentPayableDelete(
    @CurrentUser() user: CurrentUserDto,
    @Param('jobSheetPayableId') jobSheetPayableId: number,
  ) {
    return await this.jobSheetPayableService.paymentDelete(user,jobSheetPayableId);
  }

  @Post('/payable/remittance/:jobSheetPayableId')
  async remittancePayable(
    @CurrentUser() user: CurrentUserDto,
    @Param('jobSheetPayableId') jobSheetPayableId: number,
    @Body() body: RemittanceJobSheetPayableDto,
  ) {
    return await this.jobSheetPayableService.remittance(user,jobSheetPayableId, body);
  }

  @Put('/pnl/:jobSheetNumber')
  async pnlUpdate(
    @CurrentUser() user: CurrentUserDto,
    @Param('jobSheetNumber', new TransformJobSheetNumberPipe()) jobSheetNumber: string,
    @Body() body: CreateUpdateJobSheetPnlDto[], 
  ){
    return await this.jobSheetService.updateApExchangeRate(user, jobSheetNumber, body);
  }

  @Patch('/shipment/:jobSheetNumber')
  async shipmentSave(
    @CurrentUser() user: CurrentUserDto,
    @Param('jobSheetNumber', new TransformJobSheetNumberPipe()) jobSheetNumber: string,
    @Body() body: SaveJobSheetShipmentDto,
  ){
    return await this.jobSheetService.shipmentSave(user, jobSheetNumber, body);
  }

  @Post('/receivable')
  async createReceivable(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: CreateJobSheetReceivableDto,
  ) {
    return await this.jobSheetReceivableService.create(user, body);
  }

  @Put('/receivable/approval/:invoiceNumber')
  async approvalReceivable(
    @CurrentUser() user: CurrentUserDto,
    @Param('invoiceNumber') invoiceNumber: string,
    @Body() body: ApprovalJobSheetReceivableDto,
  ) {
    return await this.jobSheetReceivableService.approval(user, invoiceNumber, body );
  }

  @Patch('/receivable/revise/:invoiceNumber')
  async reviseReceivable(
    @CurrentUser() user: CurrentUserDto,
    @Param('invoiceNumber') invoiceNumber: string,
    @Body() body: ReviseJobSheetReceivableDto,
  ) {
    return await this.jobSheetReceivableService.revise(
      user,
      body,
      invoiceNumber,
    );
  }

  @Put('/receivable/payment/:invoiceNumber')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 1048576 * 10 } }),
  )
  async paymentReceivable(
    @CurrentUser() user: CurrentUserDto,
    @Param('invoiceNumber') invoiceNumber: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: SubmitPaymentJobSheetReceivableDto,
  ) {
    /*if (!file) {
      throw new BadRequestException('Please attach proof of payment');
    }*/
    return await this.jobSheetReceivableService.payment(user,invoiceNumber, body, file);
  }

  @Delete('/receivable/payment/:jobSheetReceivablePaymentId')
  async paymentReceivableDelete(
    @CurrentUser() user: CurrentUserDto,
    @Param('jobSheetReceivablePaymentId') jobSheetReceivablePaymentId: number,
  ) {
    return await this.jobSheetReceivableService.paymentDelete(user,jobSheetReceivablePaymentId);
  }

  @Post('/receivable/remittance/:invoiceNumber')
  async remittanceReceivable(
    @CurrentUser() user: CurrentUserDto,
    @Param('invoiceNumber') invoiceNumber: string,
    @Body() body: RemittanceJobSheetReceivableDto,
  ) {
    return await this.jobSheetReceivableService.remittance(user,invoiceNumber, body);
  }

}


