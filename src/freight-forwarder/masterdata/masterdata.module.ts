import { Module } from '@nestjs/common';
import { CustomersModule } from 'src/freight-forwarder/customers/customers.module';
import { PriceComponentsModule } from 'src/freight-forwarder/price-components/price-components.module';
import { RedisModule } from 'src/redis/redis.module';
import { OriginDestinationModule } from 'src/freight-forwarder/origin-destination/origin-destination.module';
import { MasterdataController } from './masterdata.controller';
import { PhoneCodesModule } from 'src/freight-forwarder/phone-codes/phone-codes.module';
import { ShipmentTypesModule } from 'src/freight-forwarder/shipment-types/shipment-types.module';
import { PackagingTypesModule } from 'src/freight-forwarder/packaging-types/packaging-types.module';
import { KindOfGoodsModule } from 'src/freight-forwarder/kind-of-goods/kind-of-goods.module';
import { FclTypesModule } from 'src/freight-forwarder/fcl-types/fcl-types.module';
import { CompaniesModule } from 'src/freight-forwarder/companies/companies.module';
import { UsersModule } from 'src/freight-forwarder/users/users.module';
import { PortsModule } from 'src/freight-forwarder/ports/ports.module';
import { BanksModule } from 'src/freight-forwarder/banks/banks.module';
import { CurrenciesModule } from 'src/freight-forwarder/currencies/currencies.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from 'src/entities/company.entity';
import { VendorPricesModule } from '../vendor-prices/vendor-prices.module';
import { ThirdPartyModule } from '../third-parties/third-parties.module';

@Module({
  controllers: [MasterdataController],
  providers: [],
  imports: [
    TypeOrmModule.forFeature([Company]),
    CustomersModule,
    OriginDestinationModule,
    PriceComponentsModule,
    RedisModule,
    PhoneCodesModule,
    ShipmentTypesModule,
    PackagingTypesModule,
    KindOfGoodsModule,
    FclTypesModule,
    CompaniesModule,
    UsersModule,
    PortsModule,
    BanksModule,
    CurrenciesModule,
    VendorPricesModule,
    ThirdPartyModule,
  ],
})
export class MasterdataModule {}
