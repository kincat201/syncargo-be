import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';

import * as pdf from 'pdf-creator-node';
import { readFile } from 'node:fs/promises';
import { ContainerType, ShipmentType, ShipmentVia } from 'src/enums/enum';
import { Helper } from 'src/freight-forwarder/helpers/helper';
import { format } from 'date-fns';

@Injectable()
export class PdfService {
  constructor(
    private readonly helper: Helper,
    private readonly httpService: HttpService,
  ) {}

  async createQuotation(data, preview = false, buffer = false) {
    let html = await readFile(
      './src/pdf/templates/quotation/index.html',
      'utf8',
    );

    if (data.shipmentType === ShipmentType.SEAFCL) {
      html = await readFile(
        './src/pdf/templates/quotation/seafcl.html',
        'utf8',
      );
    } else if (data.shipmentType === ShipmentType.SEABREAKBULK) {
      html = await readFile(
        './src/pdf/templates/quotation/seabreakbulk.html',
        'utf8',
      );
    }

    if (!data.company.logo) {
      data.company.logo =
        'https://syncargo.com/_nuxt/img/logo-syncargo.22b2a15.svg';
    }

    const options = {
      header: {
        height: '2cm',
        format: 'Letter',
      },
      footer: {},
    };

    if (preview) {
      Object.assign(data, {
        company: {
          name: data.company.name,
          address: data.company.address,
          npwp: data.company.npwp,
          logo:
            data.company.logo ||
            'https://syncargo.com/_nuxt/img/logo-syncargo.22b2a15.svg',
          quotationNotes: data.company.quotationNotes?.split('\n'),
          quotationRemark: data.company.quotationRemark?.split('\n'),
          subtotalQuotation: data.company.subtotalQuotation,
        },
        customer: {
          companyName: 'FF Customer Name',
          fullName: 'Customer PIC Name',
        },
        rfqNumber: 'RFQ/Number',
        shipmentVia: 'Air',
        shipmentService: 'Port to Port',
        countryFrom: 'Indonesia',
        cityFrom: 'Jakarta',
        portOfLoading: 'Soekarno-Hatta Airport',
        addressFrom: 'Jl. Sudirman',
        zipcodeFrom: '16242',
        countryTo: 'Jepang',
        cityTo: 'Hokkaido',
        portOfDischarge: 'Hokkaido Airport',
        addressTo: 'Jl. Sapporo',
        zipcodeTo: '40127',
        shipmentDate: '2022-12-10',
        shipmentType: 'Air Cargo',
        totalQty: 0,
        estimatedTotalWeight: 0,
        volumetric: '0',
        packingList: [
          {
            width: 0,
            height: 0,
            length: 0,
            weight: 0,
            packageQty: 0,
            packagingType: 'Palletes',
            index: 1,
            len: 2,
            isAir: 'true',
          },
          {
            width: 0,
            height: 0,
            length: 0,
            weight: 0,
            packageQty: 0,
            packagingType: 'Palletes',
            index: 2,
            len: 2,
            isAir: 'true',
          },
        ],
        validUntil: '30/12/2022',
        shippingLine: 'Garuda Indonesia',
        minDelivery: 12,
        maxDelivery: 20,
        currency: 'IDR',
        bidprices: [
          {
            priceCompName: 'Price of component',
            uom: 'Per Container',
            subtotal: '0',
            note: 'note',
            index: 1,
            len: 3,
          },
          {
            priceCompName: 'Price of component',
            uom: 'Per Container',
            subtotal: '0',
            note: 'note',
            index: 2,
            len: 3,
          },
          {
            priceCompName: 'Price of component',
            uom: 'Per Container',
            subtotal: '0',
            note: 'note',
            index: 3,
            len: 3,
          },
        ],
        subtotal: 0,
      });
    } else {
      const [from, to] = data.shipmentService.split(' to ');
      if (from === 'Port') {
        data.addressFrom = '-';
        data.zipcodeFrom = '-';
      }
      if (to === 'Port') {
        data.addressTo = '-';
        data.zipcodeTo = '-';
      }
      data.shipmentDate = format(new Date(data.shipmentDate), 'd LLL yyyy');
      data.validUntil = data.validUntil?.split('-').reverse().join('/');
      data.packingList.forEach((el, i) => {
        el.index = i + 1;
        el.len = data.packingList.length;
        el['isReefer'] =
          el.containerType === ContainerType.REEFER ? 'true' : 'false';
        el['isAir'] = data.shipmentVia === ShipmentVia.AIR ? 'true' : 'false';
      });
      data.company.quotationNotes = data.company.quotationNotes?.split('\n');
      data.company.quotationRemark = data.company.quotationRemark?.split('\n');
      data.totalQty = this.helper.setThousand(data.totalQty);
      data.estimatedTotalWeight = this.helper.setThousand(
        data.estimatedTotalWeight,
      );
      data.volumetric = this.helper.setThousand(+data.volumetric);
      data.subtotal = this.helper.setThousand(data.subtotal);
      data.bidprices?.forEach((el, i) => {
        el.index = i + 1;
        el.len = data.bidprices?.length;
        el.total = this.helper.setThousand(+el.total);
      });
    }

    const document = { html, data, type: buffer ? 'buffer' : 'stream' };

    return await pdf.create(document, options);
  }

  async createInvoice(data, preview = false, buffer = false) {
    const html = await readFile(
      './src/pdf/templates/invoice/index.html',
      'utf8',
    );

    const options = {
      header: {
        height: '2cm',
      },
      footer: {},
    };

    if (!data.company.logo) {
      data.company.logo =
        'https://syncargo.com/_nuxt/img/logo-syncargo.22b2a15.svg';
    }
    
    data.jobSheetShipment = null;
    
    if (!preview) {

      if(!data.shipment){
        data.shipment = {
          shippingNumber: null,
          rfqNumber: null,
          masterBl: null,
          houseBl: null,
        };
      }

      if(!data.quotation){
        data.quotation = {
          shipmentVia: null,
          cityFrom: null,
          cityTo: null,
          shipperCompany: null,
          consigneeCompany: null,
          kindOfGoods: null,
        };
      }

      data.jobSheetShipment = data.jobSheet?.jobSheetShipment ? data.jobSheet.jobSheetShipment : null;

      data.shipment.masterBl = data.shipment && data.shipment.masterBl
        ? data.shipment.masterBl
        : '-';
      data.shipment.houseBl = data.shipment && data.shipment.houseBl
        ? data.shipment.houseBl
        : '-';
      data.shipment.shippingNumber = data.shipment && data.shipment.shippingNumber
        ? data.shipment.shippingNumber
        : '-';

      data.quotation.shipperCompany = data.quotation && data.quotation.shipperCompany
        ? data.quotation.shipperCompany
        : '-';
      data.quotation.consigneeCompany = data.quotation && data.quotation.consigneeCompany
        ? data.quotation.consigneeCompany
        : '-';
      data.quotation.kindOfGoods = data.quotation && data.quotation.kindOfGoods
        ? data.quotation.kindOfGoods
        : '-';

      (data.invoiceDate = data.invoiceDate
        ? new Date(data.invoiceDate).toLocaleString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        : '-'),
        (data.exchangeRate = parseFloat(data.exchangeRate).toLocaleString());
      data.invoicePrices.forEach((el, i) => {
        el.price = parseFloat(el.price).toLocaleString();
        el.convertedPrice = parseFloat(el.convertedPrice).toLocaleString();
        el.subtotal = parseFloat(el.subtotal).toLocaleString();
        el.total = parseFloat(el.total).toLocaleString();
        el.subtotalCurrency = parseFloat(el.subtotalCurrency).toLocaleString();
        el.totalCurrency = parseFloat(el.totalCurrency).toLocaleString();
        el.index = i + 1;
        el.len = data.invoicePrices.length;
      });
      data.subtotal = parseFloat(data.subtotal).toLocaleString();
      data.totalVat = parseFloat(data.totalVat).toLocaleString();
      data.total = parseFloat(data.total).toLocaleString();
      data.totalCurrency = parseFloat(data.totalCurrency).toLocaleString();

      data.paymentHistories.forEach((el, i) => {
        el.paymentDate = el.paymentDate.toLocaleString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
        el.currency = data.currency; // for handling breaking template
        el.paymentAmount = parseFloat(el.paymentAmount).toLocaleString();
        el.index = i + 1;
      });

      data.paymentHistoriesLength = data.paymentHistories.length;

      if (data.paymentHistoriesLength) {
        data.paymentHistories[0].totalWordEn = data.totalWordEn;
        data.paymentHistories[0].totalWordId = data.totalWordId;
      }

      if (data.company.paymentAdvices.length > 0) {
        data.company.paymentAdvices.map((el) => {
          el.bankName = el.bankName + ' (' + el.currencyName + ')';
          el.paymentInstructionsArray = el.paymentInstructions.split('\n');
        });
      } else {
        data.company.paymentAdvices = [
          {
            bankName: '-',
            accHolder: '-',
            accNumber: '-',
            paymentInstructions: '-',
          },
        ];
      }
      data.remainingAmount = Number(data.remainingAmount).toLocaleString();
      data.remainingAmountCurrency = Number(
        data.remainingAmountCurrency,
      ).toLocaleString();

      data.dueDate = data.dueDate
        ? new Date(data.dueDate).toLocaleString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        : '-';
    } else {
      data.invoiceProcess = null;
      data.customer = {
        companyName: 'FF’s Customer Company Name',
        address: 'FF’s Customer Company Address',
        npwp: '12.345.678.9-300.666',
      };
      data.invoiceDate = '22 Februari 2022';
      data.invoiceNumber = 'INV-0000000000000';
      data.currency = 'USD';
      data.exchangeRate = '15.000';

      data.shipment = {
        shippingNumber: '00000000',
        rfqNumber: 'RFQ/000000000',
        masterBl: '00000000',
        houseBl: '00000000',
      };

      data.quotation = {
        shipmentVia: 'Air',
        cityFrom: 'Origin City',
        cityTo: 'Destination City',
        shipperCompany: 'Shipper Name',
        consigneeCompany: 'Consignee Name',
        kindOfGoods: 'Comodity',
      };

      data.invoicePrices = [
        {
          priceComponent: 'SSF',
          uom: 'Per CBM',
          price: '0',
          convertedPrice: '0',
          qty: '0',
          subtotal: '0',
          subtotalCurrency: '0',
          ppn: '0',
          total: '0',
          totalCurrency: '0',
          index: 1,
          len: 5,
          currency: 'USD',
        },
        {
          priceComponent: 'SSF',
          uom: 'Per KG',
          price: '0',
          convertedPrice: '0',
          qty: '0',
          subtotal: '0',
          subtotalCurrency: '0',
          ppn: '0',
          total: '0',
          totalCurrency: '0',
          index: 2,
          len: 5,
          currency: 'USD',
        },
        {
          priceComponent: 'SSF',
          uom: 'Per KG',
          price: '0',
          convertedPrice: '0',
          qty: '0',
          subtotal: '0',
          subtotalCurrency: '0',
          ppn: '0',
          total: '0',
          totalCurrency: '0',
          index: 3,
          len: 5,
          currency: 'USD',
        },
        {
          priceComponent: 'SSF',
          uom: 'Per KG',
          price: '0',
          convertedPrice: '0',
          qty: '0',
          subtotal: '0',
          subtotalCurrency: '0',
          ppn: '0',
          total: '0',
          totalCurrency: '0',
          index: 4,
          len: 5,
          currency: 'USD',
        },
        {
          priceComponent: 'SSF',
          uom: 'Per CBM',
          price: '0',
          convertedPrice: '0',
          qty: '0',
          subtotal: '0',
          subtotalCurrency: '0',
          ppn: '0',
          total: '0',
          totalCurrency: '0',
          index: 5,
          len: 5,
          currency: 'USD',
        },
      ];

      data.subtotal = 0;
      data.total = 0;
      data.totalCurrency = 0;
      data.totalVat = 0;
      data.totalWordEn = 'Zero Rupiah';
      data.totalWordId = 'Nol Rupiah';
      data.totalCurrencyWordEn = 'Zero Dollar';
      data.totalCurrencyWordId = 'Nol Dollar';

      data.paidCurrency = 'IDR';

      data.paymentHistories = [
        {
          createdAt: '22 March 2022',
          paymentAmount: 0,
          index: 1,
        },
      ];

      data.paymentHistoriesLength = data.paymentHistories.length;

      data.remainingAmount = 0;
      data.dueDate = '12 Mar 2022';

      data.company.paymentAdvices = data.company.paymentAdvices.filter(
        (paymentAdvice) => paymentAdvice.status === 1,
      );

      if (data.company.paymentAdvices.length > 0) {
        data.company.paymentAdvices.map((el) => {
          el.bankName = el.bankName + ' (' + el.currencyName + ')';
          el.paymentInstructionsArray = el.paymentInstructions.split('\n');
        });
      } else {
        data.company.paymentAdvices = [
          {
            bankName: '-',
            accHolder: '-',
            accNumber: '-',
            paymentInstructions: '-',
          },
        ];
      }
    }

    data.preview = preview;
    data.company.paymentAdvicesLength = data.company.paymentAdvices.length;
    if (data.thirdParties) {
      data.recipient = 'THIRD_PARTY';
    } else {
      data.recipient = 'CUSTOMER';
    }
    const document = { html, data, type: buffer ? 'buffer' : 'stream' };

    return await pdf.create(document, options);
  }

  // only used to preview
  async createPriceDetail(data, buffer = false) {
    const html = await readFile(
      './src/pdf/templates/price-detail/index.html',
      'utf8',
    );

    const options = {
      header: {
        height: '2cm',
      },
      footer: {},
    };

    Object.assign(data, {
      quotation: {
        rfqNumber: 'RFQ/000000000',
        cityFrom: 'Jakarta',
        cityTo: 'Jakarta',
        customer: {
          companyName: 'FF’s Customer Company Name',
          address: 'FF’s Customer Company Address',
          npwp: '12.345.678.9-012.345',
        },
      },
      sellingPrices: [
        {
          priceComponent: 'Price Component',
          uom: 'Per Shipment',
          price: parseFloat('12000').toLocaleString(),
          qty: 2,
          subtotal: '24000',
          note: '1-5 CBM (For Green/Yellow Line)',
        },
        {
          priceComponent: 'Price Component',
          uom: 'Per CBM',
          price: '0',
          qty: 0,
          subtotal: '0',
          note: '-',
        },
        {
          priceComponent: 'Price Component',
          uom: 'Per CBM',
          price: '0',
          qty: 0,
          subtotal: '0',
          note: '-',
        },
        {
          priceComponent: 'Price Component',
          uom: 'Per CBM',
          price: '0',
          qty: 0,
          subtotal: '0',
          note: '-',
        },
        {
          priceComponent: 'Price Component',
          uom: 'Per CBM',
          price: '0',
          qty: 0,
          subtotal: '0',
          note: '-',
        },
      ],
    });
    data.estimatedTotalAmount = data.sellingPrices.reduce(
      (acc, el) => acc + Number(el.total),
      0,
    );
    data.estimatedTotalAmount = parseFloat(
      data.estimatedTotalAmount,
    ).toLocaleString();
    data.company.priceDetailRemark =
      data.company.priceDetailRemark?.split('\n');
    const document = { html, data, type: buffer ? 'buffer' : 'stream' };

    return await pdf.create(document, options);
  }

  async createInvoiceJobsheet(data: any, buffer = false) {
    let html;
    data = {
      details: {
        ...data.details,
        totalQtyType: data.details.shipmentType?.includes('FCL')
          ? `${data.details.totalQty} Container(s)`
          : `${data.details.totalQty} Package(s)`,
        placeOfIssue: `${data.details.blCountryName}, ${
          data.details.blCityName
        }, ${format(new Date(), 'd MMMM yyyy')}`,
        blPrepaidType: data.details.blPrepaidType || '-',
        blCollectType: data.details.blCollectType || '-',
      },
    };

    if (data.details.htmlTemplate && data.details.blTemplateType === 'CUSTOM') {
      // Custom Template
      const url = data.details.htmlTemplate;
      const template = this.httpService.get(url).toPromise();
      html = (await template).data;
    } else {
      // Default Template
      html = await readFile(
        './src/pdf/templates/invoice-jobsheet/index.html',
        'utf8',
      );
    }

    const options = {
      format: 'A4',
      border: '0mm',
    };

    html = html
      ? html
      : await readFile(
          './src/pdf/templates/invoice-jobsheet/index.html',
          'utf8',
        );

    const document = { html, data, type: buffer ? 'buffer' : 'stream' };
    return await pdf.create(document, options);
  }
}
