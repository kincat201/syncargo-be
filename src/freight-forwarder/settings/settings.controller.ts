import {
  Body,
  Controller,
  UseInterceptors,
  UploadedFile,
  Param,
  Post,
  ParseIntPipe,
  Query,
  Patch,
  UseGuards,
  Put,
  Get,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Serialize } from '../interceptors/serialize.interceptor';

import { AuthGuard } from 'src/freight-forwarder/auth/auth.guard';
import { JwtAuthGuard } from 'src/freight-forwarder/auth/jwt-auth.guard';
import { CurrentUser } from 'src/freight-forwarder/decorators/current-user.decorator';

import { Roles } from '../decorators/roles.decorator';
import { RoleFF } from 'src/enums/enum';
import { RolesGuard } from '../auth/roles.guard';

import * as crypto from 'crypto';

import { UsersService } from 'src/freight-forwarder/users/users.service';
import { User } from 'src/entities/user.entity';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UpdateCompanyDto } from './dtos/update-company.dto';
import { CompaniesService } from 'src/freight-forwarder/companies/companies.service';
import { PaymentAdvicesService } from 'src/freight-forwarder/payment-advices/payment-advices.service';
import { UpdateUserPasswordDto } from './dtos/update-user-password.dto';
import { UserDto } from 'src/freight-forwarder/users/dtos/user.dto';
import { PaymentAdviceDto } from 'src/freight-forwarder/payment-advices/dtos/payment-advice.dto';
import { CreateQuotationNotesDto } from './dtos/create-quotation-notes.dto';
import { CreateUserDto } from 'src/freight-forwarder/users/dtos/create-user.dto';
import { UpdateOtherUserDto } from 'src/freight-forwarder/users/dtos/update-other-user-dto';
import { CreateInvoiceRemarkDto } from './dtos/create-invoice-remark.dto';
import { CreatePriceDetailRemarkDto } from './dtos/create-price-detail-remark.dto';
import { PdfService } from '../../pdf/pdf.service';
import { CurrentUserDto } from '../auth/dtos/current-user.dto';
import { UserHistoriesService } from '../user-histories/user-histories.service';
import { Upload } from './dtos/upload-file.dto';

@Controller('freight-forwarder/settings')
@UseGuards(AuthGuard, JwtAuthGuard)
export class SettingsController {
  constructor(
    private usersService: UsersService,
    private companiesService: CompaniesService,
    private paymentAdvicesService: PaymentAdvicesService,
    private pdfService: PdfService,
    private userHistoryService: UserHistoriesService,
  ) {}

  // user profile

  @Get('/users')
  getUserProfile(@CurrentUser() user: User) {
    return this.usersService.getUserProfile(user.userId);
  }

  @Patch('/users/photos')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 1048576 * 5 } }), // Max photo size 5MB
  )
  @Serialize(UserDto)
  async updateUserPhoto(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    try {
      const filenameSplit = file.originalname.split('.');
      const fileExt = filenameSplit[filenameSplit.length - 1];
      const fileName = `${crypto.randomBytes(32).toString('hex')}.${fileExt}`;

      const upload = {
        file,
        fileName,
        fileExt,
        fileSize: file.size,
        mimeType: file.mimetype,
      };
      return await this.usersService.updatePhoto(user.userId, upload);
    } catch (error) {
      throw error;
    }
  }

  @Patch('/users/passwords')
  async updatePassword(
    @CurrentUser() user: User,
    @Body() body: UpdateUserPasswordDto,
  ) {
    try {
      return await this.usersService.updatePassword(user.userId, body.password);
    } catch (error) {
      throw error;
    }
  }

  // change user' name and phone
  @Patch('/users/:type')
  async updateUser(
    @CurrentUser() user: User,
    @Param('type') type: string,
    @Body() body: UpdateUserDto,
  ) {
    try {
      return await this.usersService.update(user, type, body);
    } catch (error) {
      throw error;
    }
  }

  // company profile

  @Get('/companies')
  getCompanyProfile(@CurrentUser() user: User) {
    return this.companiesService.getCompanyProfile(user.companyId);
  }

  @Patch('/companies/photos')
  @Roles(RoleFF.ADMIN)
  @UseGuards(RolesGuard)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 1048576 * 5 } }), // Max photo size 5MB
  )
  async updateCompanyPhoto(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    try {
      const filenameSplit = file.originalname.split('.');
      const fileExt = filenameSplit[filenameSplit.length - 1];
      const fileName = `${crypto.randomBytes(32).toString('hex')}.${fileExt}`;

      const upload: Upload = {
        file,
        fileName,
        fileExt,
        fileSize: file.size,
        mimeType: file.mimetype,
        companyId: user.companyId,
      };
      return await this.companiesService.updatePhoto(
        user.userId,
        user.companyId,
        upload,
      );
    } catch (error) {
      throw error;
    }
  }

  // update company' name, address, phone, npwp
  @Patch('/companies')
  @Roles(RoleFF.ADMIN)
  @UseGuards(RolesGuard)
  async updateCompany(
    @CurrentUser() user: User,
    @Body() body: UpdateCompanyDto,
  ) {
    try {
      return await this.companiesService.update(
        user.userId,
        user.companyId,
        body,
      );
    } catch (error) {
      throw error;
    }
  }

  @Put('/companies/payment-advices/:paymentAdviceId')
  @Roles(RoleFF.ADMIN)
  @UseGuards(RolesGuard)
  async updateAdvice(
    @CurrentUser() user: User,
    @Param('paymentAdviceId', ParseIntPipe) id: number,
    @Body() body: PaymentAdviceDto,
  ) {
    try {
      return await this.paymentAdvicesService.submit(user, body, id);
    } catch (error) {
      throw error;
    }
  }

  @Post('/companies/payment-advices')
  @Roles(RoleFF.ADMIN)
  @UseGuards(RolesGuard)
  async postAdvice(@CurrentUser() user: User, @Body() body: PaymentAdviceDto) {
    try {
      return await this.paymentAdvicesService.submit(user, body);
    } catch (error) {
      throw error;
    }
  }

  @Put('companies/payment-advices/:paymentAdviceId/status')
  @Roles(RoleFF.ADMIN)
  @UseGuards(RolesGuard)
  hideOrShowPaymentAdvice(
    @Param('paymentAdviceId', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.paymentAdvicesService.hideOrShow(id, user);
  }

  @Patch('/companies/:id/quotation-notes')
  @Roles(RoleFF.ADMIN)
  @UseGuards(RolesGuard)
  async postNewQuotationNotes(
    @CurrentUser() user: User,
    @Body() body: CreateQuotationNotesDto,
    @Param('id') id: number,
  ) {
    try {
      return await this.companiesService.createQuotationNote(
        user.userId,
        id,
        body,
      );
    } catch (error) {
      throw error;
    }
  }

  @Patch('/companies/:id/invoice-remark')
  @Roles(RoleFF.ADMIN)
  @UseGuards(RolesGuard)
  async postInvoiceRemark(
    @CurrentUser() user: User,
    @Body() body: CreateInvoiceRemarkDto,
    @Param('id') id: number,
  ) {
    try {
      return await this.companiesService.updateInvoiceRemark(
        user.userId,
        id,
        body.invoiceRemark,
      );
    } catch (error) {
      throw error;
    }
  }

  @Patch('/companies/:id/price-detail-remark')
  @Roles(RoleFF.ADMIN)
  @UseGuards(RolesGuard)
  async priceDetailRemark(
    @CurrentUser() user: User,
    @Body() body: CreatePriceDetailRemarkDto,
    @Param('id') id: number,
  ) {
    try {
      return await this.companiesService.updatePriceDetailRemark(
        user.userId,
        id,
        body.priceDetailRemark,
      );
    } catch (error) {
      throw error;
    }
  }

  @Patch('/companies/theme-color')
  @Roles(RoleFF.ADMIN)
  @UseGuards(RolesGuard)
  async changeColor(
    @Body() body: { color: string },
    @CurrentUser() user: User,
  ) {
    try {
      return this.companiesService.changeColor(
        body.color,
        user.companyId,
        user.userId,
      );
    } catch (error) {
      throw error;
    }
  }

  @Get('/companies/invoice-download')
  @Roles(RoleFF.ADMIN)
  @UseGuards(RolesGuard)
  async getCompanyInvoiceDownload(@Res() response, @CurrentUser() user: User) {
    const data = await this.companiesService.getCompanyProfile(
      user.companyId,
      true,
    );

    const result = await this.pdfService.createInvoice({ company: data }, true);
    return result.pipe(response);
  }

  @Get('/companies/price-detail-download')
  @Roles(RoleFF.ADMIN)
  @UseGuards(RolesGuard)
  async getPriceDetailDownload(@Res() response, @CurrentUser() user: User) {
    const data = await this.companiesService.getCompanyProfile(
      user.companyId,
      true,
    );
    const result = await this.pdfService.createPriceDetail({ company: data });
    return result.pipe(response);
  }

  @Get('/companies/quotation-download')
  @Roles(RoleFF.ADMIN)
  @UseGuards(RolesGuard)
  async getQuotationDownload(@Res() response, @CurrentUser() user: User) {
    const data = await this.companiesService.getCompanyProfile(
      user.companyId,
      true,
    );
    const result = await this.pdfService.createQuotation(
      { company: data },
      true,
    );
    return result.pipe(response);
  }

  @Get('/users/all/:page/:perpage')
  @Roles(RoleFF.ADMIN)
  @UseGuards(RolesGuard)
  async getUsers(
    @Param('page', ParseIntPipe) page: number,
    @Param('perpage', ParseIntPipe) perpage: number,
    @Query('filter') filter: string,
    @Query('sort') sort: string,
    @Query('createdAt') createdAt: string,
    @CurrentUser() user,
  ) {
    try {
      return await this.usersService.getAllUsers(
        page,
        perpage,
        filter,
        sort,
        createdAt,
        user,
      );
    } catch (error) {
      throw error;
    }
  }

  @Get('/users/:userId')
  @Roles(RoleFF.ADMIN)
  @UseGuards(RolesGuard)
  async getUserDetail(@Param('userId') userId: number) {
    try {
      return await this.usersService.getUserDetail(userId);
    } catch (error) {
      throw error;
    }
  }

  @Get('/manage-user/menus')
  @Roles(RoleFF.ADMIN)
  @UseGuards(RolesGuard)
  async getMenus(@CurrentUser() user: CurrentUserDto) {
    try {
      return await this.usersService.getMenu(user);
    } catch (error) {
      throw error;
    }
  }

  @Post('/users')
  @Roles(RoleFF.ADMIN)
  @UseGuards(RolesGuard)
  async createUser(
    @CurrentUser() currentUser: CurrentUserDto,
    @Body() body: CreateUserDto,
  ) {
    return this.usersService.createUserFromSettings(currentUser, body);
  }

  @Put('/users/edit')
  @Roles(RoleFF.ADMIN)
  @UseGuards(RolesGuard)
  async updateOtherUser(
    @Body() body: UpdateOtherUserDto,
    @CurrentUser() currentUser: CurrentUserDto,
  ) {
    return this.usersService.updateOtherUser(body, currentUser);
  }

  @Get('/user-logs/all/:page/:perpage')
  @Roles(RoleFF.ADMIN)
  @UseGuards(RolesGuard)
  async getUserLogs(
    @Param('page', ParseIntPipe) page: number,
    @Param('perpage', ParseIntPipe) perpage: number,
    @Query('filter') filter: string,
    @Query('sort') sort: string,
    @Query('createdAt') createdAt: string,
    @CurrentUser() user,
  ) {
    try {
      return await this.userHistoryService.getAllUserHistory(
        page,
        perpage,
        filter,
        sort,
        createdAt,
        user,
      );
    } catch (error) {
      throw error;
    }
  }

  @Put('/companies/document/upload/hbl')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 1048576 * 5 } }),
  )
  @Roles(RoleFF.ADMIN)
  @UseGuards(RolesGuard)
  async uploadHblTemplate(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    try {
      const filenameSplit = file.originalname.split('.');
      const fileExt = filenameSplit[filenameSplit.length - 1];
      const fileName = `${crypto.randomBytes(32).toString('hex')}.${fileExt}`;

      const uploadData = {
        fileName,
        mimeType: file.mimetype,
        buffer: file.buffer,
      };

      return await this.companiesService.updateHblTemplate(
        user.companyId,
        user.userId,
        file.originalname,
        uploadData,
        fileExt,
      );
    } catch (err) {
      throw err;
    }
  }

  @Get('/companies/document/download/hbl/:documentId')
  @Roles(RoleFF.ADMIN)
  @UseGuards(RolesGuard)
  async downloadHblTemplate(
    @Param('documentId', ParseIntPipe) documentId: number,
    @CurrentUser() user: User,
    @Res() response,
  ) {
    try {
      console.log(documentId);
      return this.companiesService.downloadHblTemplate(
        user.companyId,
        documentId,
        response,
      );
    } catch (err) {
      throw err;
    }
  }

  @Get('/companies/house-of-bill-lading')
  @Roles(RoleFF.ADMIN)
  @UseGuards(RolesGuard)
  async getHbl(@CurrentUser() user: User) {
    try {
      return this.companiesService.getHblHistory(user.companyId);
    } catch (err) {
      throw err;
    }
  }

  @Get('/companies/house-of-bill-lading/template')
  @Roles(RoleFF.ADMIN)
  @UseGuards(RolesGuard)
  async getHblTemplate(@CurrentUser() user: User) {
    try {
      return await this.companiesService.getCompanyHblFormat(user.companyId);
    } catch (err) {
      throw err;
    }
  }

  @Post('/companies/house-of-bill-lading/upload/approved/:companyId')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 1048576 * 5 } }),
  )
  async insertApprovedDocs(
    @UploadedFile() file: Express.Multer.File,
    @Param('companyId', ParseIntPipe) companyId: number,
  ) {
    try {
      console.log({ file, companyId });

      return { companyId, file };
    } catch (err) {
      return err;
    }
  }

  @Get('/initiate-company-third-party')
  @Roles(RoleFF.ADMIN)
  @UseGuards(RolesGuard)
  async initiateThirdPartyMenuOnCompanies() {
    return this.usersService.initiateThirdPartyMenuOnCompanies();
  }

  @Get('/initiate-user-third-party')
  @Roles(RoleFF.ADMIN)
  @UseGuards(RolesGuard)
  async initiateThirdPartyMenuOnUsers() {
    return this.usersService.initiateThirdPartyMenuOnUsers();
  }
}
