import {
  Controller,
  Post,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  Body,
  UseInterceptors,
  UploadedFile,
  Put,
  Delete,
  BadRequestException,
  UploadedFiles,
  Res,
  NotFoundException, StreamableFile,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import * as crypto from 'crypto';
import { Response } from 'express';

import { AuthGuard } from 'src/freight-forwarder/auth/auth.guard';
import { JwtAuthGuard } from 'src/freight-forwarder/auth/jwt-auth.guard';
import { TransformRfqNumberPipe } from '../pipes/transform-rfq-number.pipe';
import { CustomerModuleInterceptor } from '../interceptors/customer-module.interceptor';

import { CurrentUser } from 'src/freight-forwarder/decorators/current-user.decorator';

import {
  OtifStatus,
  ShipmentStatus,
  ShipmentType,
  ShipmentVia,
} from 'src/enums/enum';

import { UpdateShipmentDto } from './dtos/update-shipment.dto';
import { SubmitSellingPriceDto } from 'src/freight-forwarder/shipment-selling-prices/dtos/submit-selling-price.dto';
import { SubmitShipmentOtifDto } from 'src/freight-forwarder/shipment-otifs/dtos/submit-shipment-otif.dto';
import { CurrentUserDto } from '../auth/dtos/current-user.dto';

import { ShipmentsService } from './shipments.service';
import { ShipmentFilesService } from 'src/freight-forwarder/shipment-files/shipment-files.service';
import { ShipmentOtifsService } from 'src/freight-forwarder/shipment-otifs/shipment-otifs.service';
import { ShipmentSellingPricesService } from 'src/freight-forwarder/shipment-selling-prices/shipment-selling-prices.service';
import { SubmitShipmentDelayDto } from '../shipment-delays/dtos/submit-shipment-delay.dto';
import { ShipmentDelaysService } from '../shipment-delays/shipment-delays.service';
import { ShipmentHistoryService } from '../shipment-history/shipment-history.service';
import { S3Service } from 'src/s3/s3.service';
import { PdfService } from 'src/pdf/pdf.service';
import { UploadMblDto } from './dtos/upload-mbl.dto';
import { User } from '../../entities/user.entity';
import { RequestRemoveFileDto } from './dtos/request-remove-file.dto';
import { RespondRemoveFileDto } from './dtos/respond-remove-file.dto';
import { ShipmentLabel } from '../../enums/enum';
import { CeisaService } from '../ceisa/ceisa.service';
import { UploadCeisaDto } from './dtos/upload-ceisa.dto';

@Controller('freight-forwarder/shipments')
@UseGuards(AuthGuard, JwtAuthGuard)
export class ShipmentsController {
  constructor(
    private shipmentsService: ShipmentsService,
    private shipmentFilesService: ShipmentFilesService,
    private shipmentOtifsService: ShipmentOtifsService,
    private shipmentSellingPricesService: ShipmentSellingPricesService,
    private shipmentDelaysService: ShipmentDelaysService,
    private shipmentHistoryService: ShipmentHistoryService,
    private s3Service: S3Service,
    private pdfService: PdfService,
    private ceisaService: CeisaService,
  ) {}

  @Post('/:rfqNumber/selling-prices')
  async submitSellingPrice(
    @CurrentUser() user: CurrentUserDto,
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
    @Body() body: SubmitSellingPriceDto,
  ) {
    return await this.shipmentSellingPricesService.submit(
      user,
      rfqNumber,
      false,
      body,
    );
  }

  @Get('/:rfqNumber/selling-prices')
  async getSellingPrices(
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
  ) {
    return await this.shipmentSellingPricesService.getAll(rfqNumber);
  }

  @Post('/:rfqNumber/temporary-prices')
  async issueSellingPrice(
    @CurrentUser() user: CurrentUserDto,
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
    @Body() body: SubmitSellingPriceDto,
  ) {
    return await this.shipmentSellingPricesService.submit(
      user,
      rfqNumber,
      true,
      body,
      true,
    );
  }

  @UseInterceptors(CustomerModuleInterceptor)
  @Post('/:rfqNumber')
  async create(
    @CurrentUser() user: CurrentUserDto,
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
  ) {
    try {
      return await this.shipmentsService.create(user, rfqNumber);
    } catch (error) {
      throw error;
    }
  }

  @Put('/:rfqNumber')
  async update(
    @CurrentUser() user: CurrentUserDto,
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
    @Body() body: UpdateShipmentDto,
  ) {
    try {
      return await this.shipmentsService.update(user, rfqNumber, body);
    } catch (error) {
      throw error;
    }
  }

  @Get('/:rfqNumber/files/:fileName')
  async downloadFile(
    @Res() res: Response,
    @CurrentUser() user: CurrentUserDto,
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
    @Param('fileName') fileName: string,
  ) {
    try {
      const file = await this.shipmentsService.downloadFile(
        user.companyId,
        rfqNumber,
        fileName,
      );
      if (!file) {
        throw new NotFoundException('Shipment file not found');
      }
      await this.s3Service.downloadFile(fileName, res);
    } catch (error) {
      throw error;
    }
  }

  @Get('/:section/:page/:perpage')
  async getPaged(
    @Param('page', ParseIntPipe) page: number,
    @Param('perpage', ParseIntPipe) perpage: number,
    @Param('section') shipmentStatus: ShipmentStatus,
    @Query('status') otifStatus: OtifStatus,
    @Query('via') shipmentVia: ShipmentVia,
    @Query('type') shipmentType: ShipmentType,
    @Query('label') shipmentLabel: ShipmentLabel,
    @Query('createdAt') createdAt: string,
    @Query('search') search: string,
    @Query('isCeisa') isCeisa: boolean,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return await this.shipmentsService.getPaged(
      page,
      perpage,
      shipmentStatus,
      otifStatus,
      shipmentVia,
      shipmentType,
      createdAt,
      search,
      isCeisa,
      user,
      shipmentLabel,
    );
  }

  @Get('/:rfqNumber')
  async getDetail(
    @CurrentUser() user: CurrentUserDto,
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
  ) {
    return await this.shipmentsService.getDetail(user, rfqNumber);
  }

  @Post('/:rfqNumber/otifs')
  async createOtif(
    @CurrentUser() user: CurrentUserDto,
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
    @Body() body: SubmitShipmentOtifDto,
  ) {
    const createOtif = await this.shipmentOtifsService.create(
      user,
      rfqNumber,
      body,
    );

    this.shipmentHistoryService.submit(user.userId, rfqNumber, {
      description:
        'Shipment status changed into ' +
        body.otifStatus
          .toLowerCase()
          .replace(/_/g, ' ')
          .charAt(0)
          .toUpperCase() +
        body.otifStatus.slice(1).toLowerCase().replace(/_/g, ' '),
      details: null,
    });

    return createOtif;
  }

  @Put('/:rfqNumber/otifs')
  async updateOtif(
    @CurrentUser() user: CurrentUserDto,
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
    @Body() body: SubmitShipmentOtifDto,
  ) {
    return await this.shipmentOtifsService.update(user, rfqNumber, body);
  }

  @Post('/:rfqNumber/files')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 1048576 * 5 } }),
  )
  async uploadFile(
    @CurrentUser() user: CurrentUserDto,
    @UploadedFile() file: Express.Multer.File,
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
  ) {
    try {
      const shipment = await this.shipmentsService.getOne({ rfqNumber });
      if (!shipment) {
        throw new BadRequestException('Shipment not found');
      }

      const mimeTypes = [
        'application/msword', // .doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/pdf',
        'image/jpeg', // .jpg and .jpeg
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

      const createFile = await this.shipmentFilesService.create(
        user.userId,
        rfqNumber,
        upload,
      );

      this.shipmentHistoryService.submit(user.userId, rfqNumber, {
        description: 'Upload File ' + file.originalname,
        details: null,
      });

      return createFile;
    } catch (error) {
      throw error;
    }
  }

  @Delete('/:rfqNumber/files/:fileId')
  async deleteFiles(
    @CurrentUser() user: CurrentUserDto,
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
    @Param('fileId', ParseIntPipe) fileId: number,
  ) {
    try {
      const deleteFile = await this.shipmentFilesService.delete(
        rfqNumber,
        fileId,
      );

      this.shipmentHistoryService.submit(user.userId, rfqNumber, {
        description: 'Delete File ' + deleteFile.originalName,
        details: null,
      });

      return deleteFile;
    } catch (error) {
      throw error;
    }
  }

  @Post('/:rfqNumber/delays')
  @UseInterceptors(
    FilesInterceptor('files', Infinity, { limits: { fileSize: 1048576 * 5 } }),
  )
  async submitDelay(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @CurrentUser() user: CurrentUserDto,
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
    @Body() body: SubmitShipmentDelayDto,
  ) {
    try {
      const shipment = await this.shipmentsService.getOne({ rfqNumber });
      if (!shipment) {
        throw new BadRequestException('Shipment not found');
      }

      const uploads = [];
      for (const file of files) {
        const mimeTypes = [
          'application/msword', // .doc
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
          'application/pdf',
          'image/jpeg', // .jpg and .jpeg
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

        const data = {
          file,
          fileExt,
          hashedFileName,
        };
        uploads.push(data);
      }

      return await this.shipmentDelaysService.submit(
        user.userId,
        user.companyId,
        rfqNumber,
        body,
        uploads,
      );
    } catch (error) {
      throw error;
    }
  }

  @Get(':rfqNumber/:page/:perpage/history')
  async getPagedHistory(
    @Param('page', ParseIntPipe) page: number,
    @Param('perpage', ParseIntPipe) perpage: number,
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return await this.shipmentHistoryService.getPaged(
      page,
      perpage,
      rfqNumber,
      user,
    );
  }

  /**
   * @Deprecated Function ini sudah tidak digunakan, hapus bila tidak diperlukan
   */
  @Get('/:rfqNumber/download')
  async getDetailDownload(
    @CurrentUser() user: CurrentUserDto,
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
  ) {
    try {
      const fileUrl = await this.shipmentsService.getOne({ rfqNumber }, [
        'houseBlFile',
      ]);

      if (!fileUrl.houseBlFile) {
        const data = await this.shipmentsService.getDetail(user, rfqNumber);
        const fileBuffer = await this.pdfService.createInvoiceJobsheet(data);

        const uploadParams = {
          type: 'pdf',
          hashedFileName: `${crypto.randomBytes(32).toString('hex')}.pdf`,
          buffer: fileBuffer,
        };

        const uploadUrl = await this.s3Service.uploadPDF(uploadParams);
        await this.shipmentsService.updateHblFile(rfqNumber, uploadUrl);

        return { houseBlFile: uploadUrl };
      }

      return fileUrl;
    } catch (err) {
      console.log('error', err);
      throw err;
    }
  }

  @Get('/document/master-bill-of-lading/:rfqNumber/download')
  async downloadMbl(
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
    @Res() response,
  ) {
    try {
      const shipment = await this.shipmentsService.getOne({ rfqNumber });
      if (!shipment) {
        throw new BadRequestException('Shipment not found');
      }

      return await this.shipmentsService.downloadMblFile(rfqNumber, response);
    } catch (err) {
      throw err;
    }
  }

  @Put('/document/master-bill-of-lading/:rfqNumber')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 1048576 * 5 } }),
  )
  async uploadMblDocument(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: CurrentUserDto,
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
    @Body() body: UploadMblDto,
  ) {
    try {
      const shipment = await this.shipmentsService.getOne({ rfqNumber });
      if (!shipment) {
        throw new BadRequestException('Shipment not found');
      }

      const mimeTypes = [
        'application/msword', // .doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/pdf',
        'image/jpeg', // .jpg and .jpeg
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

      const createFile = await this.shipmentFilesService.create(
        user.userId,
        rfqNumber,
        upload,
      );

      const updateShipment = await this.shipmentsService.updateMblFile(
        user.fullName,
        rfqNumber,
        body.masterBlNumber,
        body.masterBlType,
        createFile.url,
      );

      return updateShipment.blHistory;
    } catch (err) {
      throw err;
    }
  }

  @Get('/:rfqNumber/attachments')
  async downloadAttachments(
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    try {
      const zipFile = await this.shipmentsService.downloadAttachments(
        user.companyId,
        rfqNumber,
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

  @Get('/:rfqNumber/download-ceisa')
  async downloadCeisa(
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
    @CurrentUser() user: CurrentUserDto,
    @Res() response: Response,
  ) {
    try {
      let excelFile = await this.ceisaService.downloadCeisa(user, rfqNumber);

      //return excelFile;

      response.set({ 'Content-Type': 'text/xlsx' });
      response.download(excelFile);
    } catch (error) {
      throw error;
    }
  }

  @Post('/:rfqNumber/attachments/request-remove')
  async requestRemoveAttachments(
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
    @CurrentUser() user: CurrentUserDto,
    @Body() body: RequestRemoveFileDto,
  ) {
    return await this.shipmentsService.requestRemoveFile(user, rfqNumber, body);
  }

  @Get('/:rfqNumber/get-request-remove-attachments')
  async getRequestRemoveAttachments(
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return await this.shipmentsService.getRequestRemoveFile(user, rfqNumber);
  }

  @Put('/:rfqNumber/attachments/respond-request-remove')
  async respondRequestRemoveAttachments(
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
    @CurrentUser() user: CurrentUserDto,
    @Body() body: RespondRemoveFileDto,
  ) {
    return await this.shipmentsService.respondRequestRemoveFile(user, rfqNumber, body);
  }
  @Put('/:rfqNumber/upload-ceisa')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 1048576 * 5 } }),
  )
  async uploadCeisa(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: CurrentUserDto,
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
    @Body() body: UploadCeisaDto,
  ) {
    try {
      const shipment = await this.shipmentsService.getOne({ rfqNumber });
      if (!shipment) {
        throw new BadRequestException('Shipment not found');
      }

      const fileExt = '.' + file.originalname.split('.').pop();

      if ( ![ '.xlsx', ].includes(fileExt.toLowerCase())) throw new BadRequestException('Only allows upload xls, or xlsx extension');

      return await this.ceisaService.uploadCeisa(user,file,rfqNumber,body);
    } catch (err) {
      throw err;
    }
  }

  @Get('/:rfqNumber/download-ceisa-pdf')
  async downloadCeisaPdf(
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
    @CurrentUser() user: CurrentUserDto,
    @Query('path') path: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      // return await this.ceisaService.downloadPdf(rfqNumber, path,user);

      const ceisaDocumentPdf = await this.ceisaService.downloadPdf(rfqNumber, path,user);

      response.set({ 'Content-Disposition': 'attachment; filename="'+path+'"' });
      response.set({ 'Content-Type': 'application/pdf' });

      return new StreamableFile(ceisaDocumentPdf);
    } catch (error) {
      throw error;
    }
  }

  @Get('/:rfqNumber/detail-ceisa')
  async detailCeisa(
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    try {
      return await this.ceisaService.detailCeisa(rfqNumber, user);
    } catch (error) {
      throw error;
    }
  }

  @Post('/:rfqNumber/shipper-consignee')
  async createShipmentAndShipperConsignee(
    @CurrentUser() user: CurrentUserDto,
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
  ) {
    try {
      return await this.shipmentsService.createShipmentAndShipperConsignee(user, rfqNumber);
    } catch (error) {
      throw error;
    }
  }
}
