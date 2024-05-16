import { TypeOrmModuleOptions } from '@nestjs/typeorm';

import { User } from '../entities/user.entity';
import { Company } from '../entities/company.entity';
import { PriceComponent } from '../entities/price-component.entity';
import { Quotation } from '../entities/quotation.entity';
import { OriginDestination } from '../entities/origin-destination.entity';
import { Country } from '../entities/country.entity';
import { QuotationFile } from '../entities/quotation-file.entity';
import { Bid } from '../entities/bid.entity';
import { BidPrice } from '../entities/bid-price.entity';
import { Bank } from '../entities/bank.entity';
import { Currency } from '../entities/currency.entity';
import { PaymentAdvice } from '../entities/payment-advice.entity';
import { Customer } from '../entities/customer.entity';
import { PhoneCode } from '../entities/phone-code.entity';
import { Shipment } from '../entities/shipment.entity';
import { ShipmentOtif } from '../entities/shipment-otif.entity';
import { Menu } from '../entities/menu.entity';
import { Role } from '../entities/role.entity';
import { ShipmentFile } from '../entities/shipment-file.entity';
import { ShipmentType } from '../entities/shipment-type.entity';
import { PackagingType } from '../entities/packaging-type.entity';
import { KindOfGoods } from '../entities/kind-of-goods.entity';
import { FclType } from '../entities/fcl-type.entity';
import { ShipmentSelllingPrice } from '../entities/shipment-selling-price.entity';
import { Port } from '../entities/port.entity';
import { Invoice } from '../entities/invoice.entity';
import { PaymentHistory } from '../entities/payment-history.entity';
import { InvoiceRejectLog } from '../entities/invoice-reject-log.entity';
import { ShipmentDelay } from 'src/entities/shipment-delay.entity';
import { ShipmentDelayFile } from 'src/entities/shipment-delay-file.entity';
import { QuotationExtendLog } from 'src/entities/quotation-extend-log.entity';
import { SubscriptionHistory } from 'src/entities/subscription-history.entity';
import { Announcement } from 'src/entities/announcement.entity';
import { InvoicePrice } from 'src/entities/invoice-price.entity';
import { NotificationSetting } from '../entities/notification-setting.entity';
import { VendorPrice } from '../entities/vendor-price.entity';
import { VendorPriceComponent } from '../entities/vendor-price-component.entity';
import { ThirdParty } from '../entities/third-party.entity';
import { JobSheet } from '../entities/job-sheet.entity';
import { JobSheetPayable } from '../entities/job-sheet-payable.entity';
import { JobSheetPayableFile } from '../entities/job-sheet-payable-files.entity';
import { JobSheetPayableHistory } from '../entities/job-sheet-payable-history.entity';
import { JobSheetPayablePayment } from '../entities/job-sheet-payable-payment.entity';
import { JobSheetPayablePrice } from '../entities/job-sheet-payable-prices.entity';
import { BlHistory } from '../entities/bl-history.entity';
import { InvoiceHistory } from '../entities/invoice-history.entity';
import { Features } from 'src/entities/features.entity';
import { CreditCheck } from '../entities/credit-check.entity';
import { CreditCheckFile } from '../entities/credit-check-file.entity';
import { CreditCheckHistory } from '../entities/credit-check-history.entity';
import { QuotationRevenueHistory } from '../entities/quotation-revenue-history.entity';
import { SalesRevenueTargetHistory } from '../entities/sales-revenue-target-history.entity';

export const typeOrmModuleOptions: TypeOrmModuleOptions = {
  type: 'mysql',
  host: process.env.DB_HOST,
  port: parseInt(<string>process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  logging: false,
  entities: [
    User,
    Company,
    PriceComponent,
    Quotation,
    QuotationRevenueHistory,
    OriginDestination,
    Country,
    QuotationFile,
    Bid,
    BidPrice,
    Bank,
    Currency,
    PaymentAdvice,
    Customer,
    PhoneCode,
    Shipment,
    ShipmentOtif,
    Menu,
    Role,
    ShipmentFile,
    ShipmentType,
    PackagingType,
    KindOfGoods,
    FclType,
    ShipmentSelllingPrice,
    Port,
    Invoice,
    InvoiceRejectLog,
    PaymentHistory,
    ShipmentDelay,
    ShipmentDelayFile,
    QuotationExtendLog,
    SubscriptionHistory,
    Announcement,
    InvoicePrice,
    NotificationSetting,
    VendorPrice,
    VendorPriceComponent,
    ThirdParty,
    JobSheet,
    JobSheetPayable,
    JobSheetPayableFile,
    JobSheetPayableHistory,
    JobSheetPayablePayment,
    JobSheetPayablePrice,
    BlHistory,
    InvoiceHistory,
    Features,
    CreditCheck,
    CreditCheckFile,
    CreditCheckHistory,
    SalesRevenueTargetHistory,
  ],
  /* Note : it is unsafe to use synchronize: true for schema synchronization
  on production once you get data in your database. */
  synchronize: false,
  autoLoadEntities: true,
  // logger: new MyCustomLogger(),
};

export const OrmConfig = {
  ...typeOrmModuleOptions,
  migrationsTableName: 'migrations',
  migrations: ['src/migrations/*.ts'],
  cli: {
    migrationsDir: 'src/migrations',
  },
};
export default OrmConfig;
