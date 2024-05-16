import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param, ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { CreateCustomerDto } from '../customers/dtos/create-customer.dto';
import { CreateOriginDestinationDto } from '../origin-destination/dtos/create-origin-destination.dto';
import { UpdateOriginDestinationDto } from '../origin-destination/dtos/update-origin-destination.dto';
import { OriginDestinationService } from '../origin-destination/origin-destination.service';
import { CustomersService } from '../customers/customers.service';
import { JwtAuthGuard } from 'src/freight-forwarder/auth/jwt-auth.guard';
import { CurrentUser } from 'src/freight-forwarder/decorators/current-user.decorator';
import { PriceComponentsService } from 'src/freight-forwarder/price-components/price-components.service';
import { CreatePriceComponentDto } from 'src/freight-forwarder/price-components/dtos/create-price-component.dto';
import { UpdatePriceComponentDto } from 'src/freight-forwarder/price-components/dtos/update-price-component.dto';
import { AuthGuard } from 'src/freight-forwarder/auth/auth.guard';
import { PhoneCodesService } from 'src/freight-forwarder/phone-codes/phone-codes.service';
import { ShipmentTypesService } from 'src/freight-forwarder/shipment-types/shipment-types.service';
import { PackagingTypesService } from 'src/freight-forwarder/packaging-types/packaging-types.service';
import { KindOfGoodsService } from 'src/freight-forwarder/kind-of-goods/kind-of-goods.service';
import { FclTypesService } from 'src/freight-forwarder/fcl-types/fcl-types.service';
import { CompaniesService } from 'src/freight-forwarder/companies/companies.service';
import { ProductType } from 'src/enums/enum';
import { CreatePortDto } from 'src/freight-forwarder/ports/dtos/create-port.dto';
import { UpdatePortDto } from 'src/freight-forwarder/ports/dtos/update-port.dto';
import { PortsService } from 'src/freight-forwarder/ports/ports.service';
import { BanksService } from 'src/freight-forwarder/banks/banks.service';
import { CurrenciesService } from 'src/freight-forwarder/currencies/currencies.service';
import { CurrentUserDto } from '../auth/dtos/current-user.dto';
import { Serialize } from '../interceptors/serialize.interceptor';
import { UserDto } from '../users/dtos/user.dto';
import { CustomerModuleInterceptor } from '../interceptors/customer-module.interceptor';
import { VendorPricesService } from '../vendor-prices/vendor-prices.service';
import { CreateVendorPriceDto } from '../vendor-prices/dtos/create-vendor-price.dto';
import { CreateThirdPartyRequest } from '../third-parties/dtos/create-third-party.dto';
import { ThirdPartyService } from '../third-parties/third-parties.service';

@Controller('freight-forwarder/masterdata')
export class MasterdataController {
  constructor(
    private customersService: CustomersService,
    private routesService: OriginDestinationService,
    private priceCompService: PriceComponentsService,
    private phoneCodesService: PhoneCodesService,
    private portsService: PortsService,
    private readonly shipmentTypesService: ShipmentTypesService,
    private readonly packagingTypesService: PackagingTypesService,
    private readonly kindOfGoodsService: KindOfGoodsService,
    private readonly fclTypesService: FclTypesService,
    private readonly companiesService: CompaniesService,
    private readonly banksService: BanksService,
    private readonly currenciesService: CurrenciesService,
    private vendorPriceService: VendorPricesService,
    private thirdPartyService: ThirdPartyService,
  ) {}

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Get('customers')
  getAllCustomer(@CurrentUser() user: CurrentUserDto) {
    return this.customersService.getAll(user);
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Get('customers/:page/:perpage')
  getCustomerPaged(
    @Param('page', ParseIntPipe) page: number,
    @Param('perpage', ParseIntPipe) perpage: number,
    @Query('filter') filter: string,
    @Query('sort') sort: string,
    @Query('isNle') isNle: boolean,
    @Query('createdAt') createdAt: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.customersService.getPaged(
      page,
      perpage,
      filter,
      sort,
      createdAt,
      user,
      isNle,
    );
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Get('customers/:id')
  async getDetailCustomer(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return await this.customersService.getDetail(id, user);
  }

  @UseInterceptors(CustomerModuleInterceptor)
  @UseGuards(AuthGuard, JwtAuthGuard)
  @Post('customers')
  createCustomer(@Body() data: CreateCustomerDto, @CurrentUser() user: CurrentUserDto) {
    return this.customersService.create(data, user);
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Put('customers/:id')
  updateCustomer(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: CreateCustomerDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.customersService.update(id, data, user);
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Put('customers/:id/status')
  hideOrShowCustomer(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserDto,
    @Query('isNle') isNle: boolean,
  ) {
    return this.customersService.hideOrShow(id, user,isNle);
  }

  @UseInterceptors(CustomerModuleInterceptor)
  @Serialize(UserDto)
  @UseGuards(AuthGuard, JwtAuthGuard)
  @Patch('customers/:customerId')
  inActivateCustomer(
    @Param('customerId') customerId: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    if (!user.customerModule) {
      throw new BadRequestException('Customer module not active')
    }

    return this.customersService.inActivate(customerId, user);
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Get('origin-destination')
  getAllRoutes(
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.routesService.getAll(user, user.companyId);
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Get('origin-destination/:page/:perpage')
  getRoutesPaged(
    @CurrentUser() user: CurrentUserDto,
    @Param('page', ParseIntPipe) page: number,
    @Param('perpage', ParseIntPipe) perpage: number,
    @Query('filter') filter: string,
    @Query('sort') sort: string,
  ) {
    return this.routesService.getPaged(
      user.companyId,
      page,
      perpage,
      filter,
      sort,
      user,
    );
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Get('origin-destination/countries')
  getCountries(
    @CurrentUser() user: CurrentUserDto,
    @Query('all') all: boolean,
  ) {
    return this.routesService.getCountries(user, user.companyId,all);
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Get('origin-destination/countries/:countryCode/cities')
  getCitiesByCountry(
    @CurrentUser() user: CurrentUserDto,
    @Param('countryCode') countryCode: string
  ) {
    return this.routesService.getCitiesByCountry(
      user.companyId,
      countryCode,
      user,
    );
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Get('origin-destination/:id')
  getDetailRoutes(
    @CurrentUser() user: CurrentUserDto,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.routesService.getDetail(user.companyId, id, user);
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Post('origin-destination')
  createOriginRoutes(
    @CurrentUser() user: CurrentUserDto,
    @Body() data: CreateOriginDestinationDto,
  ) {
    return this.routesService.create(user.companyId, user.userId, data);
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Put('origin-destination/:id')
  updateOriginRoutes(
    @CurrentUser() user: CurrentUserDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateOriginDestinationDto,
  ) {
    return this.routesService.update(user.companyId, user.userId, id, data);
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Put('origin-destination/:id/status')
  hideOrShowRoutes(
    @CurrentUser() user: CurrentUserDto,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.routesService.hideOrShow(user.companyId, user.userId, id);
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Get('price-component')
  getAllPriceComponent(@CurrentUser() user: CurrentUserDto) {
    return this.priceCompService.getAll(user.companyId, user.isTrial);
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Get('price-component/:page/:perpage')
  getPriceComponentPaged(
    @CurrentUser() user: CurrentUserDto,
    @Param('page', ParseIntPipe) page: number,
    @Param('perpage', ParseIntPipe) perpage: number,
    @Query('filter') filter: string,
    @Query('sort') sort: string,
  ) {
    return this.priceCompService.getPaged(
      user.companyId,
      page,
      perpage,
      filter,
      sort,
      user.isTrial,
    );
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Get('price-component/:id')
  getDetailPriceComponent(
    @CurrentUser() user: CurrentUserDto,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.priceCompService.getDetail(user.companyId, id);
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Post('price-component')
  createPriceComponent(
    @CurrentUser() user: CurrentUserDto,
    @Body() data: CreatePriceComponentDto,
  ) {
    return this.priceCompService.create(user.companyId, user.userId, data);
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Put('price-component/:id')
  updatePriceComponent(
    @CurrentUser() user: CurrentUserDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdatePriceComponentDto,
  ) {
    return this.priceCompService.update(user.companyId, user.userId, id, data);
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Put('price-component/:id/status')
  hideOrShowPriceComponent(
    @CurrentUser() user: CurrentUserDto,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.priceCompService.hideOrShow(user.companyId, user.userId, id);
  }

  @Get('phone-codes')
  getPhoneCodes() {
    return this.phoneCodesService.getAll();
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Get('shipment-types')
  getShipmentTypes() {
    return this.shipmentTypesService.getAll();
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Get('packaging-types/:shipmentTypeCode')
  getPackagingTypes(@Param('shipmentTypeCode') shipmentTypeCode: string) {
    return this.packagingTypesService.getAll(shipmentTypeCode);
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Get('kind-of-goods/:productType')
  getKindOfGoods(@Param('productType') productType: ProductType) {
    return this.kindOfGoodsService.getAll(productType);
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Get('fcl-types')
  getFclTypes() {
    return this.fclTypesService.getAll();
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Get('quotas')
  getQuota(@CurrentUser() user: CurrentUserDto) {
    return this.companiesService.getQuota(user.companyId);
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Get('ports/:countryCode/:portType')
  getAllPorts(
    @CurrentUser() user: CurrentUserDto, 
    @Param('countryCode') countryCode: string,
    @Param('portType') portType: string,
  ) {
    return this.portsService.getAll(user, { countryCode, portType });
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Get('ports/:type/:page/:perpage')
  getPortPaged(
    @CurrentUser() user: CurrentUserDto,
    @Param('type') portType: string,
    @Param('page', ParseIntPipe) page: number,
    @Param('perpage', ParseIntPipe) perpage: number,
    @Query('filter') filter: string,
    @Query('sort') sort: string,
  ) {
    return this.portsService.getPaged(user.companyId, portType, page, perpage, filter, sort);
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Post('ports')
  createPort(
    @CurrentUser() user: CurrentUserDto,
    @Body() data: CreatePortDto,
  ) {
    return this.portsService.create(user.companyId, user.userId, data);
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Put('ports/:id')
  updatePort(
    @CurrentUser() user: CurrentUserDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdatePortDto,
  ) {
    return this.portsService.update(user.companyId, user.userId, id, data);
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Put('ports/:id/status')
  hideOrShowPort(
    @CurrentUser() user: CurrentUserDto,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.portsService.hideOrShow(user.companyId, user.userId, id);
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Get('banks')
  async getAllBanks(@CurrentUser() user: CurrentUserDto) {
    return await this.banksService.findAll(user.companyId)
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Get('currencies')
  async getAllCurrencies(@CurrentUser() user: CurrentUserDto) {
    return await this.currenciesService.findAll(user.companyId)
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Get('vendor-price')
  getAllVendorPrice(
    @CurrentUser() user: CurrentUserDto,
    @Query('countryFrom') countryFrom: string,
    @Query('countryTo') countryTo: string,
    @Query('cityFrom') cityFrom: string,
    @Query('cityTo') cityTo: string,
    @Query('shipmentType') shipmentType: string,
  ) {
    return this.vendorPriceService.getAll(user.companyId,countryFrom,countryTo,cityFrom,cityTo,shipmentType);
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Get('vendor-price/:page/:perpage')
  getVendorPricePaged(
    @CurrentUser() user: CurrentUserDto,
    @Param('page', ParseIntPipe) page: number,
    @Param('perpage', ParseIntPipe) perpage: number,
    @Query('filter') filter: string,
    @Query('sort') sort: string,
    @Query('countryFrom') countryFrom: string,
    @Query('countryTo') countryTo: string,
    @Query('cityFrom') cityFrom: string,
    @Query('cityTo') cityTo: string,
    @Query('shipmentType') shipmentType: string,
  ) {
    return this.vendorPriceService.getPaged(user.companyId, page, perpage, filter, sort,countryFrom,countryTo,cityFrom,cityTo,shipmentType);
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Get('vendor-price/:id')
  getDetailVendorPrice(
    @CurrentUser() user: CurrentUserDto,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.vendorPriceService.getDetail(user.companyId, id);
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Post('vendor-price/:id')
  saveVendorPrice(
    @CurrentUser() user: CurrentUserDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: CreateVendorPriceDto,
  ) {
    return this.vendorPriceService.save(user.companyId,id , data);
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Put('vendor-price/:id/status')
  hideOrShowVendorPrice(
    @CurrentUser() user: CurrentUserDto,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.vendorPriceService.hideOrShow(user.companyId, id);
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Get('third-party')
  getAllThirdParty(@CurrentUser() user: CurrentUserDto) {
    return this.thirdPartyService.getAll(user);
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Get('third-party/details/:id')
  getThirdPartyDetail(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.thirdPartyService.getThirdPartyDetail(user, Number(id));
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Post('third-party')
  createThirdParty(
    @CurrentUser() user: CurrentUserDto,
    @Body() data: CreateThirdPartyRequest,
  ) {
    return this.thirdPartyService.createThirdParty(user, data);
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Put('third-party/:id')
  updateThirdParty(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserDto,
    @Body() data: CreateThirdPartyRequest,
  ) {
    return this.thirdPartyService.updateThirdParty(user, data, id);
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Put('third-party/status/:id/:status')
  updateThirdPartyStatus(
    @Param('id', ParseIntPipe) id: number,
    @Param('status', ParseBoolPipe) status: boolean,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.thirdPartyService.updateThirdPartyStatus(user, id, status);
  }

  @UseGuards(AuthGuard, JwtAuthGuard)
  @Get('third-party/:page/:perpage')
  getThirdPartyPaged(
    @Param('page', ParseIntPipe) page: number,
    @Param('perpage', ParseIntPipe) perpage: number,
    @Query('filter') filter: string,
    @Query('sort') sort: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.thirdPartyService.getPaged(page, perpage, filter, sort, user);
  }
}
