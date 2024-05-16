// packages
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';

// shared modules
import { MailModule } from './mail/mail.module';
import { S3Module } from './s3/s3.module';
import { PdfModule } from './pdf/pdf.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { RedisModule } from './redis/redis.module';

// freight forwarder's modules
import { UsersModule } from './freight-forwarder/users/users.module';
import { AuthModule } from './freight-forwarder/auth/auth.module';
import { PaymentAdvicesModule } from './freight-forwarder/payment-advices/payment-advices.module';
import { BanksModule } from './freight-forwarder/banks/banks.module';
import { SettingsModule } from './freight-forwarder/settings/settings.module';
import { BidsModule } from './freight-forwarder/bids/bids.module';
import { QuotationsModule } from './freight-forwarder/quotations/quotations.module';
import { QuotationFilesModule } from './freight-forwarder/quotation-files/quotation-files.module';
import { MasterdataModule } from './freight-forwarder/masterdata/masterdata.module';
import { CustomersModule } from './freight-forwarder/customers/customers.module';
import { OriginDestinationModule } from './freight-forwarder/origin-destination/origin-destination.module';
import { PriceComponentsModule } from './freight-forwarder/price-components/price-components.module';
import { CurrenciesModule } from './freight-forwarder/currencies/currencies.module';
import { PhoneCodesModule } from './freight-forwarder/phone-codes/phone-codes.module';
import { ShipmentsModule } from './freight-forwarder/shipments/shipments.module';
import { ShipmentOtifsModule } from './freight-forwarder/shipment-otifs/shipment-otifs.module';
import { DashboardModule } from './freight-forwarder/dashboard/dashboard.module';
import { ShipmentFilesModule } from './freight-forwarder/shipment-files/shipment-files.module';
import { ShipmentTypesModule } from './freight-forwarder/shipment-types/shipment-types.module';
import { PackagingTypesModule } from './freight-forwarder/packaging-types/packaging-types.module';
import { KindOfGoodsModule } from './freight-forwarder/kind-of-goods/kind-of-goods.module';
import { FclTypesModule } from './freight-forwarder/fcl-types/fcl-types.module';
import { ShipmentSellingPricesModule } from './freight-forwarder/shipment-selling-prices/shipment-selling-prices.module';
import { PortsModule } from './freight-forwarder/ports/ports.module';
import { InvoicesModule } from './freight-forwarder/invoices/invoices.module';
import { CaslModule } from './freight-forwarder/casl/casl.module';
import { PaymentHistoriesModule } from './freight-forwarder/payment-histories/payment-histories.module';
import { ShipmentDelaysModule } from './freight-forwarder/shipment-delays/shipment-delays.module';
import { ChatModule } from './freight-forwarder/chat/chat.module';
import { ShippingLineModule } from './freight-forwarder/shipping-lines/shipping-line.module';
import { AnnouncementsModule } from './freight-forwarder/announcements/announcements.module';
import { NotificationsModule } from './freight-forwarder/notifications/notifications.module';

// keep this stay at low!
import { typeOrmModuleOptions } from './config/orm.config';
import { ThirdPartyModule } from './freight-forwarder/third-parties/third-parties.module';
import { JobSheetModule } from './freight-forwarder/jobsheets/jobsheets.module';
import { JobSheetPayableModule } from './freight-forwarder/jobsheet-payables/jobsheet-payable-module';
import { OcrModule } from './freight-forwarder/ocr/ocr.module'
import { HblDynamicModule } from './freight-forwarder/hbl-dynamic/hbl-dynamic.module';
import { CreditCheckModule } from './freight-forwarder/credit-checks/credit-check.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [`.env`],
    }),
    ThrottlerModule.forRoot(),
    ScheduleModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get('MONGODB_URI'),
      }),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        ...typeOrmModuleOptions,
        // logging: true,
      }),
    }),
    RedisModule,
    UsersModule,
    AuthModule,
    MasterdataModule,
    CustomersModule,
    OriginDestinationModule,
    PaymentAdvicesModule,
    PriceComponentsModule,
    BanksModule,
    MailModule,
    SettingsModule,
    BidsModule,
    QuotationsModule,
    QuotationFilesModule,
    WhatsappModule,
    CurrenciesModule,
    S3Module,
    PhoneCodesModule,
    ShipmentsModule,
    ShipmentOtifsModule,
    ShipmentFilesModule,
    ShipmentTypesModule,
    PackagingTypesModule,
    KindOfGoodsModule,
    FclTypesModule,
    ShipmentSellingPricesModule,
    PdfModule,
    DashboardModule,
    CaslModule,
    PortsModule,
    InvoicesModule,
    PaymentHistoriesModule,
    ShipmentDelaysModule,
    ChatModule,
    ShippingLineModule,
    AnnouncementsModule,
    NotificationsModule,
    ThirdPartyModule,
    JobSheetModule,
    JobSheetPayableModule,
    OcrModule,
    HblDynamicModule,
    CreditCheckModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
