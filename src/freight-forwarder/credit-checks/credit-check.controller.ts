import {
  Body,
  Controller,
  Post,
  Get,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Param,
  Query,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { CreditCheckService } from './credit-check.service';
import { AuthGuard } from '../auth/auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { RoleFF } from 'src/enums/enum';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../decorators/current-user.decorator';
import { CurrentUserDto } from '../auth/dtos/current-user.dto';
import { CreateCreditCheckRequest } from './dtos/create-credit-check-request.dto';
import { ParseIntPipe } from '@nestjs/common';
import { CreditCheckStatus } from '../../enums/credit-check';
import { PaginatedResult } from '../third-parties/dtos/pagination-response.dto';
import { CreditCheck } from '../../entities/credit-check.entity';
import { S3Service } from '../../s3/s3.service';
import { Response } from 'express';

@UseGuards(AuthGuard, JwtAuthGuard)
@Controller('freight-forwarder/credit-check')
export class CreditCheckController {
  constructor(
    private creditCheckService: CreditCheckService,
    private s3Service: S3Service,
  ) {}

  @Post('/create-credit-check')
  @Roles(RoleFF.ADMIN)
  @UseGuards(RolesGuard)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 1048576 * 5 } }), // Max photo size 5MB
  )
  async createCreditCheck(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: CreateCreditCheckRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.creditCheckService.createCreditCheck(user, body, file);
  }

  @Get('/:page/:perPage')
  @Roles(RoleFF.ADMIN)
  @UseGuards(RolesGuard)
  async getCreditCheckListPaged(
    @Param('page', ParseIntPipe) page: number,
    @Param('perPage', ParseIntPipe) perPage: number,
    @Query('filter') filter: string,
    @Query('status') creditCheckStatus: CreditCheckStatus,
    @Query('createdAt') filterDateRange: string,
    @CurrentUser() user: CurrentUserDto,
  ): Promise<PaginatedResult<CreditCheck>> {
    return this.creditCheckService.getCreditCheckListPaged(
      page,
      perPage,
      filter,
      creditCheckStatus,
      filterDateRange,
      user,
    );
  }

  @Get('/:id')
  @Roles(RoleFF.ADMIN)
  @UseGuards(RolesGuard)
  async getCreditCheckDetail(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.creditCheckService.getCreditCheckDetail(id, user);
  }

  @Post('/:id/submit-proof')
  @Roles(RoleFF.ADMIN)
  @UseGuards(RolesGuard)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 1048576 * 5 } }), // Max photo size 5MB
  )
  async submitPaymentProof(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.creditCheckService.submitPaymentProof(id, file, user);
  }

  @Get('/:fileId/attachments/:fileName')
  @Roles(RoleFF.ADMIN)
  @UseGuards(RolesGuard)
  async downloadAttachment(
    @Res() res: Response,
    @CurrentUser() user: CurrentUserDto,
    @Param('fileId', ParseIntPipe) fileId: number,
    @Param('fileName') fileName: string,
  ) {
    try {
      const file =
        await this.creditCheckService.getAttachmentFileByFileNameAndFileId(
          fileName,
          user,
          fileId,
        );

      if (!file) {
        throw new NotFoundException('Quotation file not found');
      }
      const extension = fileName.split('.').pop();
      if (extension === 'pdf') {
        fileName = `${extension}_${fileName}`;
      }
      await this.s3Service.downloadFile(fileName, res);
    } catch (error) {
      throw error;
    }
  }
}
