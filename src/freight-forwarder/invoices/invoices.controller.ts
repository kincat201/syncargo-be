import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Get,
  Query,
  ParseIntPipe,
  Res,
  Patch,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as crypto from 'crypto';

import { AuthGuard } from 'src/freight-forwarder/auth/auth.guard';
import { JwtAuthGuard } from 'src/freight-forwarder/auth/jwt-auth.guard';

import { CurrentUser } from 'src/freight-forwarder/decorators/current-user.decorator';
import { CustomerModuleInterceptor } from '../interceptors/customer-module.interceptor';
import { TransformRfqNumberPipe } from '../pipes/transform-rfq-number.pipe';

import {
  InvoiceLabel,
  InvoiceProcess,
  InvoiceStatus,
  ShipmentType,
  ShipmentVia,
  TempActiveFinish,
  TemporaryProformaStatus,
} from 'src/enums/enum';

import { CreateInvoiceDto } from './dtos/create-invoice.dto';
import { SettleInvoiceDto } from './dtos/settle-invoice.dto';
import { UpdateIssuedInvoiceDto } from './dtos/update-issued-invoice.dto';
import { UpdateInvoiceDto } from './dtos/update-invoice.dto';
import { UpdatePaymentHistoryStatusDto } from './dtos/update-payment-history-status.dto';
import { CurrentUserDto } from '../auth/dtos/current-user.dto';
import { SubmitSellingPriceDto } from '../shipment-selling-prices/dtos/submit-selling-price.dto';

import { InvoicesService } from './invoices.service';
import { PdfService } from 'src/pdf/pdf.service';
import { ShipmentSellingPricesService } from '../shipment-selling-prices/shipment-selling-prices.service';
import { ShareProformaDto } from './dtos/share-proforma.dto';
import { EditInvoiceDto } from '../invoice-history/dto/edit-invoice.dto';
import { InvoiceHistoryService } from '../invoice-history/invoice-history-service';
import { ApprovalEditInvoiceDto } from '../invoice-history/dto/approval-edit-invoice.dto';

@UseGuards(AuthGuard, JwtAuthGuard)
@Controller('freight-forwarder/invoices')
export class InvoicesController {
  constructor(
    private invoicesService: InvoicesService,
    private invoiceHistoryService: InvoiceHistoryService,
    private pdfService: PdfService,
    private shipmentSellingPricesService: ShipmentSellingPricesService,
  ) {}

  @UseInterceptors(CustomerModuleInterceptor)
  @Post()
  async create(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: CreateInvoiceDto,
  ) {
    const createInvoice = await this.invoicesService.create(user, body);
    return createInvoice;
  }

  @UseInterceptors(CustomerModuleInterceptor)
  @Post('/:invoiceNumber/share-proforma')
  async shareProforma(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: ShareProformaDto,
    @Param('invoiceNumber') invoiceNumber: string,
  ) {
    const shareProformaInvoice = await this.invoicesService.shareProforma(user, body, invoiceNumber);
    return shareProformaInvoice;
  }

  @Get('/:invoiceNumber/preview')
  async getPreview(
    @Param('invoiceNumber') invoiceNumber: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return await this.invoicesService.getPreview(invoiceNumber, user);
  }

  @Put('/:invoiceNumber/settle')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 1048576 * 10 } }),
  )
  async settleInvoice(
    @CurrentUser() user: CurrentUserDto,
    @UploadedFile() file: Express.Multer.File,
    @Param('invoiceNumber') invoiceNumber: string,
    @Body() data: SettleInvoiceDto,
  ) {
    try {
      if (!file) {
        throw new BadRequestException('Please attach proof of payment');
      }

      const mimeTypes = [
        'application/msword', // .doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/pdf',
        'image/jpeg', // .jpg and .jpeg
        'image/png', //png
        ,
      ];
      if (!mimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          'Only allows upload doc, docx, pdf, jpg, or jpeg extention',
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

      return await this.invoicesService.settleInvoice(
        invoiceNumber,
        data,
        upload,
        user,
      );
    } catch (error) {
      throw error;
    }
  }

  @Get('/download/:invoiceNumber')
  async downloadPDF(
    @Res() response,
    @Param('invoiceNumber') invoiceNumber: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    const data = await this.invoicesService.getPreview(invoiceNumber, user);
    const result = await this.pdfService.createInvoice(data);
    return result.pipe(response);
  }

  @Get('/:invoiceNumber/:invoiceStatus')
  async getInvoiceDetail(
    @CurrentUser() user: CurrentUserDto,
    @Param('invoiceNumber') invoiceNumber: string,
    @Param('invoiceStatus') invoiceStatus: InvoiceStatus,
  ) {
    return await this.invoicesService.getDetail(
      invoiceNumber,
      invoiceStatus,
      user,
    );
  }

  @Get(':invoiceStatus/:page/:perpage')
  async getInvoicePaged(
    @CurrentUser() user: CurrentUserDto,
    @Param('invoiceStatus') invoiceStatus: InvoiceStatus,
    @Param('page', ParseIntPipe) page: number,
    @Param('perpage', ParseIntPipe) perpage: number,
    @Query('filter') filter: string,
    @Query('date') date: string,
    @Query('dueDate') dueDate: string,
    @Query('shipmentVia') shipmentVia: ShipmentVia,
    @Query('shipmentType') shipmentType: ShipmentType,
    @Query('invoiceProcess') invoiceProcess: InvoiceProcess,
    @Query('invoiceLabel') invoiceLabel: InvoiceLabel,
    @Query('origin') origin: string,
    @Query('destination') destination: string,
    @Query('tempStatus') tempStatus: TemporaryProformaStatus,
    @Query('tempActiveFinish') tempActiveFinish: TempActiveFinish,
  ) {
    return await this.invoicesService.getList(
      invoiceStatus,
      invoiceProcess,
      invoiceLabel,
      tempStatus,
      tempActiveFinish,
      page,
      perpage,
      filter,
      date,
      dueDate,
      shipmentVia,
      shipmentType,
      origin,
      destination,
      user,
    );
  }

  // update invoice
  @Put('/:invoiceNumber')
  async updateInvoice(
    @Param('invoiceNumber') invoiceNumber: string,
    @Body() body: UpdateInvoiceDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return await this.invoicesService.updateInvoice(invoiceNumber, body, user);
  }

  // issue invoice
  @Put('/:invoiceNumber/issue')
  async issueInvoice(
    @Param('invoiceNumber') invoiceNumber: string,
    @Body() body: UpdateIssuedInvoiceDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return await this.invoicesService.issueInvoice(invoiceNumber, body, user);
  }

  // update issued invoice
  @Put('/:invoiceNumber/issued')
  async updateIssuedInvoice(
    @Param('invoiceNumber') invoiceNumber: string,
    @Body() body: UpdateIssuedInvoiceDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return await this.invoicesService.updateIssuedInvoice(
      invoiceNumber,
      body,
      user,
    );
  }

  // resend invoice
  @UseInterceptors(CustomerModuleInterceptor)
  @Put('/:invoiceNumber/resend')
  async resendInvoice(
    @Param('invoiceNumber') invoiceNumber: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return await this.invoicesService.resendInvoice(invoiceNumber, user);
  }

  // confirm or reject payment invoice
  @Put('/:paymentHistoryId/payment-history/status')
  @UseInterceptors(CustomerModuleInterceptor)
  async updatePaymentHistoryStatus(
    @Param('paymentHistoryId') paymentHistoryId: number,
    @Body() body: UpdatePaymentHistoryStatusDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return await this.invoicesService.updatePaymentHistoryStatus(
      paymentHistoryId,
      body,
      user,
    );
  }

  // get detail temporary proforma invoice
  @Get('/:rfqNumber')
  async getDetailTemporary(
    @CurrentUser() user: CurrentUserDto,
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
  ) {
    return await this.invoicesService.getDetailTemporary(user, rfqNumber);
  }

  @Patch('/:rfqNumber/temporary-prices')
  async closeTemporary(
    @CurrentUser() user: CurrentUserDto,
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
  ) {
    return await this.shipmentSellingPricesService.closeTemporaryProforma(
      user,
      rfqNumber,
    );
  }

  @Post('/:rfqNumber/temporary-prices')
  async submitTemporary(
    @CurrentUser() user: CurrentUserDto,
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
    @Body() body: SubmitSellingPriceDto,
  ) {
    return await this.shipmentSellingPricesService.submit(
      user,
      rfqNumber,
      true,
      body,
    );
  }

  @Put('/:invoiceNumber/edit')
  async editInvoice(
    @CurrentUser() user: CurrentUserDto,
    @Param('invoiceNumber') invoiceNumber: string,
    @Body() body: EditInvoiceDto,
  ) {
    return await this.invoiceHistoryService.editInvoice(
      invoiceNumber,
      body,
      user,
    );
  }

  @Put('/:invoiceNumber/edit-approval')
  async editApprovalInvoice(
    @CurrentUser() user: CurrentUserDto,
    @Param('invoiceNumber') invoiceNumber: string,
    @Body() body: ApprovalEditInvoiceDto,
  ) {
    return await this.invoiceHistoryService.editApprovalInvoice(
      invoiceNumber,
      body,
      user,
    );
  }
}
