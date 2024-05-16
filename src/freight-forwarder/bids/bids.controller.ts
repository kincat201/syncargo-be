import {
  Body,
  Controller,
  Post,
  UseGuards,
  Get,
  Param,
  Put,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from 'src/freight-forwarder/auth/auth.guard';
import { JwtAuthGuard } from 'src/freight-forwarder/auth/jwt-auth.guard';
import { CurrentUser } from 'src/freight-forwarder/decorators/current-user.decorator';
import { User } from 'src/entities/user.entity';
import { BidsService } from './bids.service';
import { CreateBidDto } from './dtos/create-bid.dto';
import { CreateDraftBidDto } from './dtos/create-draft-bid.dto';
import { TransformRfqNumberPipe } from '../pipes/transform-rfq-number.pipe';
import { CurrentUserDto } from '../auth/dtos/current-user.dto';
import { CustomerModuleInterceptor } from '../interceptors/customer-module.interceptor';

@UseGuards(AuthGuard, JwtAuthGuard)
@Controller('freight-forwarder/bids')
export class BidsController {
  constructor(private bidsService: BidsService) {}

  // Save & Next
  @Post('/')
  async create(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: CreateBidDto,
  ) {
    return await this.bidsService.create(user, body);
  }

  // Save As Draft
  @Post('/draft')
  async createDraftBid(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: CreateDraftBidDto,
  ) {
    return await this.bidsService.create(user, body);
  }

  @Get('/:rfqNumber')
  async getDetail(
    @CurrentUser() user: User,
    @Param('rfqNumber', new TransformRfqNumberPipe()) rfqNumber: string,
  ) {
    return await this.bidsService.getDetail(rfqNumber, user);
  }

  // place quotation bid (waiting) & edit quotation bid (submitted)
  @UseInterceptors(CustomerModuleInterceptor)
  @Put()
  async update(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: CreateBidDto,
  ) {
    return await this.bidsService.create(user, body, true);
  }
}
