import {
  Body,
  Controller,
  Get,
  Res,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  Patch,
  HttpStatus,
  NotFoundException,
  DefaultValuePipe,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as crypto from 'crypto';
import { format } from 'date-fns';

import { AuthGuard } from 'src/freight-forwarder/auth/auth.guard';
import { JwtAuthGuard } from 'src/freight-forwarder/auth/jwt-auth.guard';
import { CustomerModuleInterceptor } from '../interceptors/customer-module.interceptor';

import { CurrentUser } from 'src/freight-forwarder/decorators/current-user.decorator';

import { TransformRfqNumberPipe } from '../pipes/transform-rfq-number.pipe';

import { User } from 'src/entities/user.entity';

import {
  QuotationFileSource,
  RfqLabel,
  RfqStatus,
  Role,
  ShipmentType,
  ShipmentVia,
} from 'src/enums/enum';

import { QuotationFilesService } from 'src/freight-forwarder/quotation-files/quotation-files.service';
import { QuotationsService } from './quotations.service';
import { PdfService } from 'src/pdf/pdf.service';
import { S3Service } from 'src/s3/s3.service';
import { MailService } from 'src/mail/mail.service';
import { WhatsappService } from 'src/whatsapp/whatsapp.service';
import { OriginDestinationService } from '../origin-destination/origin-destination.service';
import { QiscusService } from '../../qiscus/qiscus.service';
import { QontakService } from '../../qontak/qontak.service';

import { CreateQuotationDto } from './dtos/create-quotation.dto';
import { UpdateQuotationDto } from './dtos/update-quotation.dto';
import { SubmitShipperConsigneeDto } from './dtos/submit-shipper-consignee.dto';
import { ShareQuotationDto } from './dtos/share-quotation.dto';
import { SubmitDraftShipperConsigneeDto } from './dtos/submit-draft-shipper-consignee.dto ';
import { CurrentUserDto } from '../auth/dtos/current-user.dto';
import { ExtendQuotationDto } from './dtos/extend-quotation.dto';
import { MultipleCompleteQuotationDto } from './dtos/multiple-complete-quotation.dto';
import { RequestRemoveFileDto } from '../shipments/dtos/request-remove-file.dto';
import { UpdateRevenueNoteQuotation } from './dtos/update-revenue-note-quotation.dto';

@UseGuards(AuthGuard, JwtAuthGuard)
@Controller('freight-forwarder/quotations')
export class QuotationsController {
  constructor(
    private quotationFilesService: QuotationFilesService,
    private quotationsService: QuotationsService,
    private pdfService: PdfService,
    private s3Service: S3Service,
    private mailService: MailService,
    private whatsappService: WhatsappService,
    private qiscusService: QiscusService,
    private qontakService: QontakService,
    private readonly originDestinationService: OriginDestinationService,
  ) { }

  @Get('/download/:rfqNumber')
  async download(
    @Res() response: Response,
    @Param('rfqNumber', new TransformRfqNumberPipe) rfqNumber: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    try {
      const quotation = await this.quotationsService.getOne({ rfqNumber }, [
        'rfqStatus',
      ]);
      if (
        !quotation ||
        ![RfqStatus.SUBMITTED, RfqStatus.COMPLETED].includes(
          quotation.rfqStatus,
        )
      ) {
        throw new BadRequestException('Quotation not found');
      }

      const quotationData = await this.quotationsService.getDownloadData(
        rfqNumber,
        user
      );
      const result = await this.pdfService.createQuotation(quotationData);
      return result.pipe(response);
    } catch (error) {
      throw error;
    }
  }

  @Get('/:rfqNumber/attachments/:fileName')
  async downloadAttachment(
    @Res() res: Response,
    @CurrentUser() user: CurrentUserDto,
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
    @Param('fileName') fileName: string,
  ) {
    try {
      const file = await this.quotationsService.downloadAttachment(
        user.companyId,
        rfqNumber,
        fileName,
      );
      if (!file) {
        throw new NotFoundException('Quotation file not found');
      }
      await this.s3Service.downloadFile(fileName, res);
    } catch (error) {
      throw error;
    }
  }

  @Get('/:rfqNumber/attachments')
  async downloadAttachments(
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
    @CurrentUser() user: User,
    @Query('source', new DefaultValuePipe(QuotationFileSource.QUOTATION))
    source: QuotationFileSource,
    @Res() res: Response,
  ) {
    try {
      const zipFile = await this.quotationsService.downloadAttachments(
        user.companyId,
        rfqNumber,
        source,
      );

      res.set('content-type', 'application/zip');

      // TODO: return immediately the zip without upload it first
      const hashedFileName = `${crypto.randomBytes(32).toString('hex')}'.zip'`;
      const data = {
        file: {
          buffer: zipFile.toBuffer(),
          mimetype: '.zip',
        },
        hashedFileName,
      };

      await this.s3Service.uploadFiles([data]);
      await this.s3Service.downloadFile(hashedFileName, res);
    } catch (error) {
      throw error;
    }
  }

  @Post('/:rfqNumber')
  async shareQuotation(
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
    @Param('rfqNumber') rfqNumberRaw: string,
    @Body() body: ShareQuotationDto,
    @CurrentUser() user: CurrentUserDto,
    @Res() response: Response,
  ) {
    try {
      const quotation = await this.quotationsService.getOne({ rfqNumber }, [
        'rfqStatus',
      ]);
      if (
        !quotation ||
        ![RfqStatus.SUBMITTED, RfqStatus.COMPLETED].includes(
          quotation.rfqStatus,
        )
      ) {
        throw new BadRequestException('Quotation not found');
      }

      const { via, email, phone } = body;

      const quotationData = await this.quotationsService.getDownloadData(
        rfqNumber,
        user
      );

      if (via === 'email') {
        const pdf = await this.pdfService.createQuotation(quotationData);
        const data = {
          customerName: quotationData.customer.fullName,
          customerEmail: quotationData.customer.email,
          rfqNumber,
          ffName: quotationData.company.name,
          ffLogo: quotationData.company.logo,
          ffEmail: quotationData.company.email,
          ffAddress: quotationData.company.address,
          ffPhoneCode: quotationData.company.phoneCode,
          ffPhoneNumber: quotationData.company.phoneNumber,
          createdDate: format(new Date(quotationData.createdAt), 'd LLL yyyy'),
          countryFrom: quotationData.countryFrom,
          cityFrom: quotationData.cityFrom,
          countryTo: quotationData.countryTo,
          cityTo: quotationData.cityTo,
          shipmentVia: quotationData.shipmentVia,
        }

        const origin = await this.originDestinationService.getCityCode(user.companyId, data.cityFrom)
        const destination = await this.originDestinationService.getCityCode(user.companyId, data.cityTo)
        Object.assign(data, { origin: origin.cityCode, destination: destination.cityCode })

        data['quotationUrl'] = process.env.NODE_ENV === 'production' ?
          `https://${user.customerSubdomain}.customer.syncargo.com` :
          `https://${user.customerSubdomain}.syncargo.com`

        data['quotationUrl'] += '/quotation/details/' + data.rfqNumber

        this.mailService.shareQuotation(email, pdf, data);
        return response
          .status(HttpStatus.OK)
          .json({ message: 'Quotation has been sent to the email' });
      } else if (via === 'whatsapp') {
        if (user.role != Role.CUSTOMER && quotation.limitWaFF == 0)
          throw new BadRequestException('You cannot share WA anymore');

        const buffer = await this.pdfService.createQuotation(
          quotationData,
          false,
          true,
        );
        const hashedFileName = `${crypto.randomBytes(5).toString('hex')}`;
        const fileName = `${quotationData.customer.fullName.replace(/[^A-Z0-9]/ig, "-")}_${rfqNumberRaw}_${hashedFileName}`;
        await this.s3Service.uploadPDF({ type:'Quotation', hashedFileName: fileName, buffer })

        const sendWa = await this.qontakService.shareWAQuotation(phone, {
          companyName: quotationData.company.name,
          shipmentVia: quotationData.shipmentVia,
          countryFrom: quotationData.countryFrom,
          countryTo: quotationData.countryTo,
        },'Quotation_'+fileName);

        if(sendWa.error) {
          return response
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .json({ message: 'Failed sent quotation to the whatsapp : '+sendWa.error.message })
        }

        await this.quotationsService.updateQuotationWaLimit(rfqNumber, user);

        return response
          .status(HttpStatus.OK)
          .json({ message: 'Quotation has been sent to the whatsapp' });
      } else {
        throw new BadRequestException('Only allow share via email or whatsapp');
      }
    } catch (error) {
      throw error;
    }
  }

  @Post()
  async create(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: CreateQuotationDto,
  ) {
    return await this.quotationsService.create(user, body);
  }

  // also used as edit in manage shipment - see details - details
  @Put('/:rfqNumber')
  async update(
    @CurrentUser() user: CurrentUserDto,
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
    @Body() body: UpdateQuotationDto,
  ) {
    return await this.quotationsService.update(
      user,
      rfqNumber,
      body,
    );
  }

  @Get('/:rfqNumber')
  async getDetail(
    @CurrentUser() user: CurrentUserDto,
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
  ) {
    return await this.quotationsService.getDetail(user, rfqNumber);
  }

  @Get('/:section/:page/:perpage')
  async getPaged(
    @Param('page', ParseIntPipe) page: number,
    @Param('perpage', ParseIntPipe) perpage: number,
    @Param('section') section: string,
    @Query('status') rfqStatus: RfqStatus,
    @Query('label') label: RfqLabel,
    @Query('via') shipmentVia: ShipmentVia,
    @Query('type') shipmentType: ShipmentType,
    @Query('createdAt') createdAt: string,
    @Query('search') search: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return await this.quotationsService.getPaged(
      page,
      perpage,
      section,
      rfqStatus,
      label,
      shipmentVia,
      shipmentType,
      createdAt,
      search,
      user,
    );
  }

  @Get('nle/:section/:page/:perpage')
  async getPagedNle(
    @Param('page', ParseIntPipe) page: number,
    @Param('perpage', ParseIntPipe) perpage: number,
    @Param('section') section: string,
    @Query('status') rfqStatus: RfqStatus,
    @Query('label') label: RfqLabel,
    @Query('via') shipmentVia: ShipmentVia,
    @Query('type') shipmentType: ShipmentType,
    @Query('createdAt') createdAt: string,
    @Query('search') search: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return await this.quotationsService.getPagedNle(
      page,
      perpage,
      section,
      rfqStatus,
      label,
      shipmentVia,
      shipmentType,
      createdAt,
      search,
      user,
    );
  }

  @Put('/:rfqNumber/files')
  @UseInterceptors(
    FilesInterceptor('files', 5, { limits: { fileSize: 1048576 * 5 } }),
  )
  async updateFiles(
    @CurrentUser() user: User,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
    @Body() body: { deletedFiles?: string },
  ) {
    try {
      const quotation = await this.quotationsService.getOne({ rfqNumber }, [
        'id',
      ]);
      if (!quotation) {
        throw new BadRequestException('Quotation not found');
      }

      const uploads = [];
      if (files?.length) {
        for (let file of files) {
          const mimeTypes = [
            'application/msword', // .doc
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
            'application/pdf',
            'image/jpeg', // .jpg and .jpeg
          ];
          if (!mimeTypes.includes(file.mimetype)) {
            throw new BadRequestException(
              'Only allows upload doc, docx, pdf, jpg, or jpeg extension',
            );
          }

          const fileExt = '.' + file.originalname.split('.').pop();
          const hashedFileName = `${crypto
            .randomBytes(32)
            .toString('hex')}${fileExt}`;

          const data = {
            file,
            fileExt,
            hashedFileName,
          };
          uploads.push(data);
        }
      }

      return await this.quotationFilesService.update(
        user.userId,
        user.companyId,
        rfqNumber,
        body.deletedFiles,
        uploads,
      );
    } catch (error) {
      throw error;
    }
  }

  // step 3 and override (quotation submitted)
  @Put('/:rfqNumber/shipper-consignee')
  async submitShipperConsignee(
    @CurrentUser() user: CurrentUserDto,
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
    @Body() body: SubmitDraftShipperConsigneeDto,
  ) {
    return await this.quotationsService.submitShipperConsignee(
      user,
      rfqNumber,
      body,
    );
  }

  @UseInterceptors(CustomerModuleInterceptor)
  @Put('/:rfqNumber/shipper-consignee/draft')
  async submitDraftShipperConsignee(
    @CurrentUser() user: CurrentUserDto,
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
    @Body() body: SubmitDraftShipperConsigneeDto,
  ) {
    return await this.quotationsService.submitShipperConsignee(
      user,
      rfqNumber,
      body,
    );
  }

  @UseInterceptors(CustomerModuleInterceptor)
  @Patch('/:rfqNumber')
  async cancelOrRejectQuotation(
    @CurrentUser() user: CurrentUserDto,
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
  ) {
    return await this.quotationsService.cancelOrRejectQuotation(
      user,
      rfqNumber,
    );
  }

  @Get('/:rfqNumber/preview')
  async getPreviewData(
    @CurrentUser() user: CurrentUserDto,
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
  ) {
    return await this.quotationsService.getDownloadData(
      rfqNumber,
      user
    );
  }

  // update expiration date
  @Patch('/:rfqNumber/expiration')
  @UseInterceptors(CustomerModuleInterceptor)
  async updateExpiration(
    @CurrentUser() user: CurrentUserDto,
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
    @Body() body: ExtendQuotationDto,
  ) {
    return await this.quotationsService.updateExpiration(
      user,
      rfqNumber,
      body.type,
      body.date,
    );
  }

  @Get('/:rfqNumber/shipmentVia')
  async getShipmentVia(
    @CurrentUser() user: CurrentUserDto,
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
  ) {
    return await this.quotationsService.getShipmentVia(
      rfqNumber,
      user.companyId,
    );
  }

  @Patch('/complete/multiple')
  async multipleCompleteQuotation(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: MultipleCompleteQuotationDto,
  ) {
    return await this.quotationsService.multipleCompleteQuotation(user, body);
  }

  @Get('/available/jobSheet')
  async getRfqJobSheet(
    @CurrentUser() user: CurrentUserDto,
  ) {
    return await this.quotationsService.getAvailableJobSheet(
      user.companyId,
    );
  }

  @Post('/:rfqNumber/chat-attachments/request-remove')
  async requestRemoveAttachments(
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
    @CurrentUser() user: CurrentUserDto,
    @Body() body: RequestRemoveFileDto,
  ) {
    return await this.quotationsService.requestRemoveFileFromChat(user, rfqNumber, body);
  }

  @Patch('/:rfqNumber/revenue-note')
  @UseInterceptors(CustomerModuleInterceptor)
  async updateRevenueNote(
    @CurrentUser() user: CurrentUserDto,
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
    @Body() body: UpdateRevenueNoteQuotation,
  ) {
    return await this.quotationsService.updateRevenueNote(
      user,
      rfqNumber,
      body,
    );
  }
}
