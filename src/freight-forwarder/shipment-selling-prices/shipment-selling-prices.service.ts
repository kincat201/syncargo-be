import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, Repository } from 'typeorm';

import { ShipmentSellingPriceType } from 'src/enums/enum';

import { SubmitSellingPriceDto } from './dtos/submit-selling-price.dto';
import { CurrentUserDto } from '../auth/dtos/current-user.dto';

import { ShipmentSelllingPrice } from 'src/entities/shipment-selling-price.entity';
import { Shipment } from 'src/entities/shipment.entity';
import { InvoicePrice } from 'src/entities/invoice-price.entity';

import { ShipmentHistoryService } from '../shipment-history/shipment-history.service';

@Injectable()
export class ShipmentSellingPricesService {
  constructor(
    @InjectRepository(ShipmentSelllingPrice)
    private shipmentSellingPriceRepo: Repository<ShipmentSelllingPrice>,
    @InjectRepository(Shipment) private shipmentRepo: Repository<Shipment>,
    @InjectRepository(InvoicePrice)
    private invoicePriceRepo: Repository<InvoicePrice>,
    private connection: Connection,
    private shipmentHistoryService: ShipmentHistoryService,
  ) {}

  // 1. update selling prices in manage shipment
  // 2. issue selling prices (init temporary proforma invoice prices)
  // 3. update temporary profroma invoice prices in invoice
  async submit(
    user: CurrentUserDto,
    rfqNumber: string,
    isTemporary: boolean,
    body: SubmitSellingPriceDto,
    isIssueTemporary = false,
  ) {
    let previousSellingPrices = [];
    const sellingPricesValue = [];

    const shipment = await this.shipmentRepo
      .createQueryBuilder('s')
      .innerJoin('s.quotation', 'q')
      .where(
        `
        s.rfqNumber = :rfqNumber
        AND s.status = :status
        AND q.companyId = :companyId
      `,
      )
      .setParameters({ rfqNumber, status: 1, companyId: user.companyId })
      .getOne();

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    const isIdr = body.currency === 'IDR';

    shipment.currency = body.currency ?? shipment.currency;

    const query = this.shipmentSellingPriceRepo
      .createQueryBuilder('tp')
      .where(`tp.rfqNumber = :rfqNumber AND tp.status = :status`, {
        rfqNumber,
        status: 1,
      });

    if (!isTemporary) {
      // 1. update selling prices in manage shipment
      const tempProformaInvoicePrices = await query
        .andWhere(`tp.type IN (:...type)`, {
          type: [
            ShipmentSellingPriceType.TEMP_INVOICE,
            ShipmentSellingPriceType.INVOICE,
            ShipmentSellingPriceType.CLOSED_INVOICE,
          ],
        })
        .getCount();

      if (tempProformaInvoicePrices) {
        throw new BadRequestException(
          'Only allow update in manage invoice - temporary invoice',
        );
      }

      previousSellingPrices = await this.shipmentSellingPriceRepo
        .createQueryBuilder('tp')
        .where(
          `
          tp.rfqNumber = :rfqNumber
          AND tp.type = :type
          AND tp.status = :status
        `,
        )
        .setParameters({
          rfqNumber,
          type: ShipmentSellingPriceType.SHIPMENT,
          status: 1,
        })
        .getMany()

      body.sellingPrices.forEach(el => {
        const convertedPrice = el.price * body.exchangeRate
        const obj = Object.assign(el, {
          convertedPrice: isIdr ? el.price : convertedPrice,
          subtotal: isIdr ? el.price * el.qty : convertedPrice * el.qty,
          rfqNumber,
          subtotalCurrency: el.price * el.qty,
          createdByUserId: user.userId,
        });

        sellingPricesValue.push(obj);
      });
    } else if (isTemporary && !isIssueTemporary) {
      // 3. update temporary profroma invoice prices in invoice
      previousSellingPrices = await query
        .andWhere(`tp.type = :type`, {
          type: ShipmentSellingPriceType.TEMP_INVOICE,
        })
        .getMany();

      if (!previousSellingPrices?.length) {
        throw new NotFoundException(
          'Temporary proforma invoice prices not found',
        );
      }

      body.sellingPrices.forEach(el => {
        const convertedPrice = el.price * body.exchangeRate
        const subtotal = isIdr ? el.price * el.qty : convertedPrice * el.qty
        const subtotalCurrency = el.price * el.qty;
        const ppn = body.defaultPpn ? body.ppn : el.ppn
        const obj = Object.assign(el, {
          convertedPrice: isIdr ? el.price : convertedPrice,
          subtotal,
          subtotalCurrency,
          totalCurrency: subtotalCurrency,
          total: subtotal + (ppn / 100) * subtotal,
          rfqNumber,
          type: ShipmentSellingPriceType.TEMP_INVOICE,
          createdByUserId: user.userId,
        })

        sellingPricesValue.push(obj);
      });

      shipment.defaultPpn = body.defaultPpn;
      shipment.ppn = body.ppn;
    } else if (isTemporary && isIssueTemporary) {
      // 2. issue selling prices (init temporary proforma invoice prices)
      previousSellingPrices = await this.shipmentSellingPriceRepo
        .createQueryBuilder('tp')
        .where(
          `
          tp.rfqNumber = :rfqNumber
          AND tp.type = :type
          AND tp.status = :status
        `,
        )
        .setParameters({
          rfqNumber,
          type: ShipmentSellingPriceType.SHIPMENT,
          status: 1,
        })
        .getMany();

      if (!previousSellingPrices?.length) {
        throw new NotFoundException('Selling prices not found');
      }

      body.sellingPrices.forEach(el => {
        const convertedPrice = el.price * body.exchangeRate
        const subtotal = isIdr ? el.price * el.qty : convertedPrice * el.qty
        const subtotalCurrency = el.price * el.qty;
        const obj = Object.assign(el, {
          convertedPrice: isIdr ? el.price : convertedPrice,
          subtotal,
          subtotalCurrency,
          total: subtotal, // because ppn is initialized by 0
          totalCurrency: subtotalCurrency,
          rfqNumber,
          type: ShipmentSellingPriceType.TEMP_INVOICE,
          fromShipment: true,
          createdByUserId: user.userId,
        })

        sellingPricesValue.push(obj);
      });
    }
    shipment.currency = body.currency;
    shipment.exchangeRate = body.exchangeRate;

    previousSellingPrices.forEach((el) => {
      el.status = 0;
      el.updatedByUserId = user.userId;
    });

    const sellingPrices =
      this.shipmentSellingPriceRepo.create(sellingPricesValue);

    return await this.connection.transaction(async (entityManager) => {
      await entityManager.save(shipment);

      await entityManager.save(previousSellingPrices); // soft delete
      const result = await entityManager.save(sellingPrices);

      if (!isTemporary) {
        const differentChangesSellingPrice = [];

        for (
          let i = 0;
          i < Math.max(previousSellingPrices.length, body.sellingPrices.length);
          i++
        ) {
          if (!previousSellingPrices[i]) {
            differentChangesSellingPrice.push(
              body.sellingPrices[i].priceComponent +
                ' IDR ' +
                body.sellingPrices[i].total +
                ' has been added',
            );
          } else if (!body.sellingPrices[i]) {
            differentChangesSellingPrice.push(
              previousSellingPrices[i].priceComponent +
                ' IDR ' +
                previousSellingPrices[i].total +
                ' has been removed',
            );
          } else if (
            previousSellingPrices[i].priceComponent ==
              body.sellingPrices[i].priceComponent &&
            previousSellingPrices[i].total != body.sellingPrices[i].total
          ) {
            differentChangesSellingPrice.push(
              previousSellingPrices[i].priceComponent +
                ' has been updated from IDR ' +
                previousSellingPrices[i].total +
                ' to IDR ' +
                body.sellingPrices[i].total,
            );
          } else if (
            previousSellingPrices[i].priceComponent !=
            body.sellingPrices[i].priceComponent
          ) {
            differentChangesSellingPrice.push(
              previousSellingPrices[i].priceComponent +
                ' IDR ' +
                previousSellingPrices[i].total +
                ' has been updated to ' +
                body.sellingPrices[i].priceComponent +
                ' IDR ' +
                previousSellingPrices[i].total,
            );
          }
        }

        if (differentChangesSellingPrice.length > 0) {
          this.shipmentHistoryService.submit(user.userId, rfqNumber, {
            description: 'Price has been updated : ',
            details: JSON.stringify(differentChangesSellingPrice),
          });
        }
      }
      return result;
    });
  }

  // get all prices for manage shipment and temporary invoice
  async getAll(rfqNumber: string, isTemporary = false) {
    const query = this.shipmentRepo
      .createQueryBuilder('s')
      .innerJoin('s.shipmentSellingPrice', 'ssp')
      .select([
        's.defaultPpn',
        's.ppn',
        's.currency',
        's.exchangeRate',
        'ssp.type',
        'ssp.priceComponent',
        'ssp.uom',
        'ssp.price',
        'ssp.convertedPrice',
        'ssp.qty',
        'ssp.subtotal',
        'ssp.subtotalCurrency',
        'ssp.note',
      ])
      .where(
        `
        ssp.rfqNumber = :rfqNumber
        AND ssp.status = :status
      `,
      )
      .setParameters({
        rfqNumber,
        status: 1,
      })
      .orderBy('ssp.id', 'ASC');

    if (isTemporary) {
      const shipment = await query
        .addSelect(['ssp.id', 'ssp.ppn', 'ssp.total', 'ssp.fromShipment'])
        .andWhere(`ssp.type IN (:...type)`, {
          type: [
            ShipmentSellingPriceType.TEMP_INVOICE,
            ShipmentSellingPriceType.CLOSED_INVOICE,
          ],
        })
        .getOne();

      return {
        defaultPpn: shipment?.defaultPpn,
        ppn: shipment?.ppn,
        currency: shipment?.currency,
        exchangeRate: shipment?.exchangeRate,
        subtotal: shipment?.shipmentSellingPrice?.reduce((acc, el) => acc + +el.subtotal, 0),
        subtotalCurrency: shipment?.shipmentSellingPrice?.reduce((acc, el) => acc + +el.subtotalCurrency, 0),
        totalVat: shipment?.shipmentSellingPrice?.reduce((acc, el) => acc + (el.subtotal * el.ppn / 100), 0),
        sellingPrices: shipment?.shipmentSellingPrice,
      }

    }

    const shipment = await query.getOne();

    if (!shipment) {
      throw new NotFoundException('Shipment selling price not found');
    }

    delete shipment.defaultPpn;
    delete shipment.ppn;

    const isTempProformaInvoiceCreated = shipment.shipmentSellingPrice.some(
      (el) => {
        return (
          el.type === ShipmentSellingPriceType.TEMP_INVOICE ||
          el.type === ShipmentSellingPriceType.INVOICE ||
          el.type === ShipmentSellingPriceType.CLOSED_INVOICE
        );
      },
    );

    return {
      isTempProformaInvoiceCreated,
      currency: shipment.currency,
      exchangeRate: shipment.exchangeRate,
      sellingPrices: shipment.shipmentSellingPrice,
    };
  }

  async closeTemporaryProforma(user: CurrentUserDto, rfqNumber: string) {
    const invoicePrices = await this.invoicePriceRepo
      .createQueryBuilder('ip')
      .where(
        `
        ip.rfqNumber = :rfqNumber
        AND ip.status = :status
      `,
      )
      .setParameters({
        rfqNumber,
        status: 1,
      })
      .getCount();

    if (!invoicePrices) {
      throw new BadRequestException(
        'Only allow close temporary as the price(s) has been splitted',
      );
    }

    const sellingPrices = await this.shipmentSellingPriceRepo
      .createQueryBuilder('tp')
      .where(
        `
        tp.rfqNumber = :rfqNumber
        AND tp.type = :type
        AND tp.status = :status
      `,
      )
      .setParameters({
        rfqNumber,
        type: ShipmentSellingPriceType.TEMP_INVOICE,
        status: 1,
      })
      .getMany();

    sellingPrices.forEach((el) => {
      el.type = ShipmentSellingPriceType.CLOSED_INVOICE;
      el.updatedByUserId = user.userId;
    });

    return await this.connection.transaction(async (entityManager) => {
      return await entityManager.save(sellingPrices);
    });
  }
}
