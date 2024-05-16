import { BadRequestException } from '@nestjs/common';
import { format } from 'date-fns';
import {
  InvoiceStatus, JobSheetAllStatus, JobSheetItemType,
  OtifStatus,
  PackingList,
  ShipmentService,
  ShipmentType,
  ShipmentVia,
} from 'src/enums/enum';
import { QuotationFile } from 'src/entities/quotation-file.entity';
import { ShipmentFile } from 'src/entities/shipment-file.entity';
import { SubmitShipmentOtifDto } from 'src/freight-forwarder/shipment-otifs/dtos/submit-shipment-otif.dto';
import { ShipmentOtif } from 'src/entities/shipment-otif.entity';
import { ShipmentDelay } from 'src/entities/shipment-delay.entity';
import { ShipmentDelayFile } from 'src/entities/shipment-delay-file.entity';
import { Shipment } from '../../entities/shipment.entity';

export class Helper {
  generateShipmentTypeCode(shipmentType: string) {
    const code: { [key: string]: string } = {
      AIRBREAKBULK: '0203',
      AIRCOURIER: '0202',
      AIRCARGO: '0201',
      SEABREAKBULK: '0103',
      SEALCL: '0102',
    };

    return code[shipmentType] || '0101';
  }

  checkOtif(
    shipmentService: string,
    otifStatus: string,
    otifStatusTo: string,
    invoiceStatus: string,
  ) {
    const permittedOtif: string[] = [
      OtifStatus.BOOKED,
      OtifStatus.SCHEDULED,
      OtifStatus.PICKUP,
      OtifStatus.ORIGIN_LOCAL_HANDLING,
      OtifStatus.DEPARTURE,
    ];

    if (otifStatusTo === 'REJECTED' || otifStatusTo === 'CANCELLED') {
      if (
        permittedOtif.includes(otifStatus) &&
        (!invoiceStatus || invoiceStatus === InvoiceStatus.PROFORMA)
      ) {
        return [otifStatusTo, 'FAILED'];
      }
      throw new BadRequestException(
        'Shipment can be Rejected/Cancelled as shipment status before Arrival and invoice is Pending',
      );
    }

    const otifStatusData: { [key: string]: string[] } = {
      'Door to Door': [
        'BOOKED',
        'SCHEDULED',
        'PICKUP',
        'ORIGIN_LOCAL_HANDLING',
        'DEPARTURE',
        'ARRIVAL',
        'DESTINATION_LOCAL_HANDLING',
        'DELIVERY',
        'COMPLETE',
      ],
      'Door to Port': [
        'BOOKED',
        'SCHEDULED',
        'PICKUP',
        'ORIGIN_LOCAL_HANDLING',
        'DEPARTURE',
        'ARRIVAL',
        'COMPLETE',
      ],
      'Port to Door': [
        'BOOKED',
        'SCHEDULED',
        'DEPARTURE',
        'ARRIVAL',
        'DESTINATION_LOCAL_HANDLING',
        'DELIVERY',
        'COMPLETE',
      ],
      'Port to Port': [
        'BOOKED',
        'SCHEDULED',
        'DEPARTURE',
        'ARRIVAL',
        'COMPLETE',
      ],
    };

    const shipmentStatusData = {
      BOOKED: 'WAITING',
      SCHEDULED: 'WAITING',
      PICKUP: 'ONGOING',
      ORIGIN_LOCAL_HANDLING: 'ONGOING',
      DEPARTURE: 'ONGOING',
      ARRIVAL: 'ONGOING',
      DESTINATION_LOCAL_HANDLING: 'ONGOING',
      DELIVERY: 'ONGOING',
      COMPLETE: 'COMPLETE',
    };

    const nextIndex = otifStatusData[shipmentService].indexOf(otifStatus) + 1;
    const isOtifValid =
      otifStatusTo === otifStatusData[shipmentService][nextIndex];

    if (!isOtifValid) {
      throw new BadRequestException('Please submit otif sequentially');
    }

    return [otifStatusTo, shipmentStatusData[otifStatusTo]];
  }

  toformat12h(date) {
    const formattedDate = new Date(date).toLocaleString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hourCycle: 'h12',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const reversedDate = formattedDate
      .split(' ')[0]
      .split('/')
      .reverse()
      .join('-');
    const modifiedTime = formattedDate.split(' ')[1].split('.').join(':');
    const meridiem = formattedDate.split(' ')[2];

    return `${reversedDate} ${modifiedTime} ${meridiem}`;
  }

  mapOtifBody(
    otifStatus: OtifStatus,
    body: SubmitShipmentOtifDto | ShipmentOtif,
  ) {
    const payload = {};

    if (
      otifStatus === OtifStatus.CANCELLED ||
      otifStatus === OtifStatus.REJECTED
    ) {
      Object.assign(payload, {
        reasonFailed: body.reasonFailed,
      });
    } else if (otifStatus === OtifStatus.SCHEDULED) {
      Object.assign(payload, {
        documentDate: body.documentDate,
        etd: body.etd,
        etdTime: body.etdTime,
        eta: body.eta,
        etaTime: body.etaTime,
      });
    } else if (otifStatus === OtifStatus.PICKUP) {
      Object.assign(payload, {
        pickupDate: body.pickupDate,
        pickupTime: body.pickupTime,
        location: body.location,
        driverName: body.driverName,
        driverPhone: body.driverPhone,
        vehiclePlateNumber: body.vehiclePlateNumber,
        grossWeight: body.grossWeight,
        nettWeight: body.nettWeight,
        activity: body.activity,
      });
    } else if (otifStatus === OtifStatus.ORIGIN_LOCAL_HANDLING) {
      Object.assign(payload, {
        documentDate: body.documentDate,
        noPeb: body.noPeb,
        location: body.location,
        activity: body.activity,
      });
    } else if (otifStatus === OtifStatus.DEPARTURE) {
      Object.assign(payload, {
        documentDate: body.documentDate,
        location: body.location,
        portOfLoading: body.portOfLoading,
        shippingLine: body.shippingLine,
        shippingNumber: body.shippingNumber,
        grossWeight: body.grossWeight,
        nettWeight: body.nettWeight,
        masterAwb: body.masterAwb,
        houseAwb: body.houseAwb,
        activity: body.activity,
      });
    } else if (otifStatus === OtifStatus.ARRIVAL) {
      Object.assign(payload, {
        documentDate: body.documentDate,
        location: body.location,
        portOfDischarge: body.portOfDischarge,
        activity: body.activity,
      });
    } else if (otifStatus === OtifStatus.DESTINATION_LOCAL_HANDLING) {
      Object.assign(payload, {
        documentDate: body.documentDate,
        noPeb: body.noPeb,
        location: body.location,
        activity: body.activity,
      });
    } else if (otifStatus === OtifStatus.DELIVERY) {
      Object.assign(payload, {
        pickupDate: body.pickupDate,
        pickupTime: body.pickupTime,
        location: body.location,
        driverName: body.driverName,
        driverPhone: body.driverPhone,
        vehiclePlateNumber: body.vehiclePlateNumber,
        activity: body.activity,
      });
    } else {
      Object.assign(payload, {
        documentDate: body.documentDate,
        location: body.location,
        activity: body.activity,
      });
    }

    return payload;
  }

  mapOtifResponse(shipmentOtifs: ShipmentOtif[], shipment: Shipment) {
    const response = [];

    for (let otif of shipmentOtifs) {
      const payload = this.mapOtifBody(otif.otifStatus, otif);
      Object.assign(payload, {
        otifStatus: otif.otifStatus,
        createdAt: format(otif.createdAt, 'yyyy-MM-dd HH:mm:ss'),
        updatedAt: format(otif.updatedAt, 'yyyy-MM-dd HH:mm:ss'),
        status: otif.status,
      });
      if (otif.otifStatus == OtifStatus.DEPARTURE) {
        Object.assign(payload, {
          containerNumber: shipment.containerNumber,
        });
      }

      response.push(payload);
    }

    return response;
  }

  mapFileResponse(files: ShipmentFile[] | QuotationFile[]) {
    const response = [];

    for (let file of files) {
      response.push({
        id: file.id,
        fileContainer: file.fileContainer,
        fileName: file.fileName,
        originalName: file.originalName,
        url: file.url,
        createdAt: format(file.createdAt, 'dd LLL yyyy, hh:mm a'),
        source: (file as any).source,
        platform: file.platform,
        fileStatus: (file as ShipmentFile).fileStatus,
      });
    }

    return response;
  }

  getProgressionPercentage(
    shipmentService: ShipmentService,
    otifStatus: OtifStatus,
    dashboardProgres = false,
  ) {
    const zeroPercentage = [
      OtifStatus.BOOKED,
      OtifStatus.COMPLETE,
      OtifStatus.CANCELLED,
      OtifStatus.REJECTED,
    ];
    if (zeroPercentage.includes(otifStatus)) {
      return 0;
    }

    const progressionPercentageData: {
      [key: string]: { [key: string]: number };
    } = {
      'Door to Door': {
        SCHEDULED: 10,
        PICKUP: 10,
        ORIGIN_LOCAL_HANDLING: 15,
        DEPARTURE: 35,
        ARRIVAL: 5,
        DESTINATION_LOCAL_HANDLING: 15,
        DELIVERY: 10,
      },
      'Door to Port': {
        SCHEDULED: 10,
        PICKUP: 10,
        ORIGIN_LOCAL_HANDLING: 15,
        DEPARTURE: 55,
        ARRIVAL: 10,
      },
      'Port to Door': {
        SCHEDULED: 10,
        DEPARTURE: 60,
        ARRIVAL: 5,
        DESTINATION_LOCAL_HANDLING: 15,
        DELIVERY: 10,
      },
      'Port to Port': {
        SCHEDULED: 10,
        DEPARTURE: 80,
        ARRIVAL: 10,
      },
    };

    if (dashboardProgres) {
      let total = 0;
      let current = 0;
      Object.keys(progressionPercentageData[shipmentService]).forEach(
        (item, key) => {
          if (item === otifStatus) current = key + 1;
          total++;
        },
      );
      if (current) current = (current / total) * 100;
      return current;
    }

    return progressionPercentageData[shipmentService][otifStatus];
  }

  mapPackingList(shipmentType: ShipmentType, packingList) {
    if (shipmentType.includes('AIR') || shipmentType === ShipmentType.SEALCL) {
      return packingList.map((el) => {
        return {
          packagingType: el.packagingType,
          packageQty: el.packageQty,
          weight: el.weight,
          length: el['length'],
          width: el.width,
          height: el.height,
        };
      });
    } else if (shipmentType === ShipmentType.SEAFCL) {
      return packingList.map((el) => {
        return {
          fclType: el.fclType,
          containerOption: el.containerOption,
          containerType: el.containerType,
          temperature: el.temperature,
          packagingType: el.packagingType,
          weight: el.weight,
          qty: el.qty,
        };
      });
    } else if (shipmentType === ShipmentType.SEABREAKBULK) {
      return packingList.map((el) => {
        return {
          packagingType: el.packagingType,
          packageQty: el.packageQty,
          weight: el.weight,
          length: el['length'],
          width: el.width,
          height: el.height,
          qty: el.qty,
          uom: el.uom,
        };
      });
    }
  }

  getCurrentWeek(week) {
    const firstDay = new Date(new Date().getFullYear(), 0, 1).getDay();
    const year = new Date().getFullYear();
    const d = new Date('Jan 01, ' + year);
    const w = d.getTime() - 3600000 * 24 * firstDay + 604800000 * (week - 1);
    const n1 = new Date(w);
    const n2 = new Date(w + 518400000);
    return [n1, n2];
  }

  setThousand(value) {
    const rounded = Math.round(value * 100) / 100;
    return rounded
      .toString()
      .replace('.', ',')
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  checkOverDueInvoice(dueDate) {
    return dueDate ? new Date() > new Date(dueDate) : false;
  }

  mapOtifDelayResponse(
    shipmentDelays: ShipmentDelay[],
    shipmentDelayFiles: ShipmentDelayFile[],
  ) {
    const response = [];

    for (let delay of shipmentDelays) {
      response.push({
        otifStatus: delay.otifStatus,
        delayDate: delay.delayDate,
        estimatedDelayUntil: delay.estimatedDelayUntil,
        note: delay.note,
        files: shipmentDelayFiles.filter(
          (el) => el.otifStatus === delay.otifStatus,
        ),
      });
    }

    return response;
  }

  getShipmentPercentage(
    shipmentService: ShipmentService,
    otifStatus: OtifStatus,
  ) {
    const zeroPercentage = [
      OtifStatus.BOOKED,
      OtifStatus.CANCELLED,
      OtifStatus.REJECTED,
    ];
    if (zeroPercentage.includes(otifStatus)) {
      return 0;
    }
    if (otifStatus === OtifStatus.COMPLETE) {
      return 100;
    }

    const progressionPercentageData: {
      [key: string]: { [key: string]: number };
    } = {
      'Door to Door': {
        SCHEDULED: 10,
        PICKUP: 10,
        ORIGIN_LOCAL_HANDLING: 15,
        DEPARTURE: 35,
        ARRIVAL: 5,
        DESTINATION_LOCAL_HANDLING: 15,
        DELIVERY: 10,
      },
      'Door to Port': {
        SCHEDULED: 10,
        PICKUP: 10,
        ORIGIN_LOCAL_HANDLING: 15,
        DEPARTURE: 55,
        ARRIVAL: 10,
      },
      'Port to Door': {
        SCHEDULED: 10,
        DEPARTURE: 60,
        ARRIVAL: 5,
        DESTINATION_LOCAL_HANDLING: 15,
        DELIVERY: 10,
      },
      'Port to Port': {
        SCHEDULED: 10,
        DEPARTURE: 80,
        ARRIVAL: 10,
      },
    };

    let total = 1;
    let current = 0;
    Object.keys(progressionPercentageData[shipmentService]).forEach((el, i) => {
      if (el === otifStatus) {
        current = i + 1;
      }
      total++;
    });

    return Math.round((current / total) * 100);
  }

  getPermittedMenus(menus, menuIds = []) {
    if (!menus?.length) return;

    menus.forEach((menu) => {
      if (menu.permission) menuIds.push(menu.id);
      this.getPermittedMenus(menu.children, menuIds);
    });

    return menuIds;
  }

  mapOtifIcons(
    shipmentVia: ShipmentVia,
    shipmentService: ShipmentService,
    otifStatus: OtifStatus,
    previousOtifStatus?: OtifStatus,
  ) {
    const line = {
      blue: 'http://demo-images.andalin.com/saas/b5414db315182b2ba4bb869550be23b59bf3274661fa27e953173b694ba07ec6.png',
      grey: 'http://demo-images.andalin.com/saas/28616e490d59549fbe0841604f87807ebba4399941100e7d8ff5c8e6583b6f8f.png',
    };
    const otifs = {
      'Door to Door': {
        BOOKED: {
          blue: 'https://demo-images.andalin.com/saas/537fa2c8c7345733ab638c036db5424d6d620a7a3a5a1a65ec41ca16305eeb7c.png',
          red: 'https://demo-images.andalin.com/saas/07e56d3bd272c6b4b1fa5d48a2788ca7c39fbfe99bc157178e131172d4458bfb.png',
        },
        SCHEDULED: {
          blue: 'http://demo-images.andalin.com/saas/623b79d0f6cc0ceb93ee39e3317f9299394b2e050232ef5632576826c74b27a5.png',
          grey: 'http://demo-images.andalin.com/saas/d2edf42ffdc2c9154ce049a63197c647eacd41d0ada1708fc8eee7c47a580980.png',
          red: 'https://demo-images.andalin.com/saas/dbf8ecb2f672eefb6c2abf2b432f52bf4a9b231fe568948dde0cff28db49ddd6.png',
        },
        PICKUP: {
          blue: 'http://demo-images.andalin.com/saas/b4263cfc6fe41a0cdd1ade084dd5e09e02c98d267dcf5e6bbd04b79954c6817b.png',
          grey: 'http://demo-images.andalin.com/saas/f3ff698512b6f30345abb093d758875fa3e8f98f00ecca6f41ceb73dbe7544e8.png',
          red: 'https://demo-images.andalin.com/saas/e7e8c19b32283618bb63eeed90be2cdf8047d5db526b9f05033b0c0190aab42b.png',
        },
        ORIGIN_LOCAL_HANDLING: {
          blue: 'http://demo-images.andalin.com/saas/7e4066a278e38d71f5d2bb5987fdd35fa399578f5021da8f2438f799781580ac.png',
          grey: 'http://demo-images.andalin.com/saas/fa2432d4372ad370afe080675ebfa1357c4da00da827cd2e1e117a5b7998fc20.png',
          red: 'https://demo-images.andalin.com/saas/638f3679c59891467dd5c8128965a35b7a20a8161a529cd89e97e8427257c82b.png',
        },
        DEPARTURE: {
          blue: {
            Ocean:
              'http://demo-images.andalin.com/saas/f0d2006ad3db218f4d1b445117a3e7439769b9c3279bcaa907a7793573c55250.png',
            Air: 'http://demo-images.andalin.com/saas/1d81eb1674dc89ad3654f1471c47c92e1fada4c78f13208c7e7d8c4d7c97f4f0.png',
          },
          grey: {
            Ocean:
              'http://demo-images.andalin.com/saas/8f1bd8c52d1b0c3ce62f1bd918b262a65e139b596ff182db19371d01d1757cfc.png',
            Air: 'http://demo-images.andalin.com/saas/6b231156f4fe9c13994eaef9581fdda4541bf412efb1031ce3009800ba0d8ffe.png',
          },
          red: {
            Ocean:
              'https://demo-images.andalin.com/saas/e30af964b4cff5574dcade51a8ce2294273c2f88787bd92dc57ccd415644fd2e.png',
            Air: 'http://demo-images.andalin.com/saas/523b47e70c33c08a3513f21b0a6949c3edb1f83876343e3e2115590b6ddcadb1.png',
          },
        },
        ARRIVAL: {
          blue: {
            Ocean:
              'http://demo-images.andalin.com/saas/99e3e35b7d605843247f174a7b4582fa8980b4babbe97b0f80ff0c33acec80c0.png',
            Air: 'http://demo-images.andalin.com/saas/39d416ffe1f524938790f9c67353b3f97c07c92893911b67304f72bd9cbe4612.png',
          },
          grey: {
            Ocean:
              'http://demo-images.andalin.com/saas/3c40ef35eb839f10b5aa6fb542fd32c5438298e9873ba60e54ed786b95857f30.png',
            Air: 'http://demo-images.andalin.com/saas/5464fefdf1ea802f67a1e0002937118cc3c523e97a96fb953acc9d8df8a41ae9.png',
          },
        },
        DESTINATION_LOCAL_HANDLING: {
          blue: 'http://demo-images.andalin.com/saas/7e4066a278e38d71f5d2bb5987fdd35fa399578f5021da8f2438f799781580ac.png',
          grey: 'http://demo-images.andalin.com/saas/fa2432d4372ad370afe080675ebfa1357c4da00da827cd2e1e117a5b7998fc20.png',
        },
        DELIVERY: {
          blue: 'http://demo-images.andalin.com/saas/72a6d59e0d1c76ff4d0a79f907bd41151f39ebadee8fe3e86611566a8201937f.png',
          grey: 'http://demo-images.andalin.com/saas/c42f5d6f90f44304920ffb2026596a07a704576c53e9f2951bef2c4b23ec9037.png',
        },
        COMPLETE: {
          blue: 'http://demo-images.andalin.com/saas/f30096d2edd00fdf799f20d424114f0e2c9f2974d8f07111fbe95c0b3b1617ab.png',
          grey: 'http://demo-images.andalin.com/saas/668a47d4a68302e116cfe81c83c63ab4203ce191bde0fcce70ce583c95befe38.png',
        },
      },
      'Door to Port': {
        BOOKED: {
          blue: 'https://demo-images.andalin.com/saas/537fa2c8c7345733ab638c036db5424d6d620a7a3a5a1a65ec41ca16305eeb7c.png',
          grey: 'http://demo-images.andalin.com/saas/9f8b648ad8ff107ceda6dcd17833bb7379b8593649e838f67501745fdf6c14fb.png',
          red: 'https://demo-images.andalin.com/saas/07e56d3bd272c6b4b1fa5d48a2788ca7c39fbfe99bc157178e131172d4458bfb.png',
        },
        SCHEDULED: {
          blue: 'http://demo-images.andalin.com/saas/623b79d0f6cc0ceb93ee39e3317f9299394b2e050232ef5632576826c74b27a5.png',
          grey: 'http://demo-images.andalin.com/saas/d2edf42ffdc2c9154ce049a63197c647eacd41d0ada1708fc8eee7c47a580980.png',
          red: 'https://demo-images.andalin.com/saas/dbf8ecb2f672eefb6c2abf2b432f52bf4a9b231fe568948dde0cff28db49ddd6.png',
        },
        PICKUP: {
          blue: 'http://demo-images.andalin.com/saas/b4263cfc6fe41a0cdd1ade084dd5e09e02c98d267dcf5e6bbd04b79954c6817b.png',
          grey: 'http://demo-images.andalin.com/saas/f3ff698512b6f30345abb093d758875fa3e8f98f00ecca6f41ceb73dbe7544e8.png',
          red: 'https://demo-images.andalin.com/saas/e7e8c19b32283618bb63eeed90be2cdf8047d5db526b9f05033b0c0190aab42b.png',
        },
        ORIGIN_LOCAL_HANDLING: {
          blue: 'http://demo-images.andalin.com/saas/7e4066a278e38d71f5d2bb5987fdd35fa399578f5021da8f2438f799781580ac.png',
          grey: 'http://demo-images.andalin.com/saas/fa2432d4372ad370afe080675ebfa1357c4da00da827cd2e1e117a5b7998fc20.png',
          red: 'https://demo-images.andalin.com/saas/638f3679c59891467dd5c8128965a35b7a20a8161a529cd89e97e8427257c82b.png',
        },
        DEPARTURE: {
          blue: {
            Ocean:
              'http://demo-images.andalin.com/saas/f0d2006ad3db218f4d1b445117a3e7439769b9c3279bcaa907a7793573c55250.png',
            Air: 'http://demo-images.andalin.com/saas/1d81eb1674dc89ad3654f1471c47c92e1fada4c78f13208c7e7d8c4d7c97f4f0.png',
          },
          grey: {
            Ocean:
              'http://demo-images.andalin.com/saas/8f1bd8c52d1b0c3ce62f1bd918b262a65e139b596ff182db19371d01d1757cfc.png',
            Air: 'http://demo-images.andalin.com/saas/6b231156f4fe9c13994eaef9581fdda4541bf412efb1031ce3009800ba0d8ffe.png',
          },
          red: {
            Ocean:
              'https://demo-images.andalin.com/saas/e30af964b4cff5574dcade51a8ce2294273c2f88787bd92dc57ccd415644fd2e.png',
            Air: 'http://demo-images.andalin.com/saas/523b47e70c33c08a3513f21b0a6949c3edb1f83876343e3e2115590b6ddcadb1.png',
          },
        },
        ARRIVAL: {
          blue: {
            Ocean:
              'http://demo-images.andalin.com/saas/99e3e35b7d605843247f174a7b4582fa8980b4babbe97b0f80ff0c33acec80c0.png',
            Air: 'http://demo-images.andalin.com/saas/39d416ffe1f524938790f9c67353b3f97c07c92893911b67304f72bd9cbe4612.png',
          },
          grey: {
            Ocean:
              'http://demo-images.andalin.com/saas/3c40ef35eb839f10b5aa6fb542fd32c5438298e9873ba60e54ed786b95857f30.png',
            Air: 'http://demo-images.andalin.com/saas/5464fefdf1ea802f67a1e0002937118cc3c523e97a96fb953acc9d8df8a41ae9.png',
          },
        },
        COMPLETE: {
          blue: 'http://demo-images.andalin.com/saas/f30096d2edd00fdf799f20d424114f0e2c9f2974d8f07111fbe95c0b3b1617ab.png',
          grey: 'http://demo-images.andalin.com/saas/668a47d4a68302e116cfe81c83c63ab4203ce191bde0fcce70ce583c95befe38.png',
        },
      },
      'Port to Door': {
        BOOKED: {
          blue: 'https://demo-images.andalin.com/saas/537fa2c8c7345733ab638c036db5424d6d620a7a3a5a1a65ec41ca16305eeb7c.png',
          grey: 'http://demo-images.andalin.com/saas/9f8b648ad8ff107ceda6dcd17833bb7379b8593649e838f67501745fdf6c14fb.png',
          red: 'https://demo-images.andalin.com/saas/07e56d3bd272c6b4b1fa5d48a2788ca7c39fbfe99bc157178e131172d4458bfb.png',
        },
        SCHEDULED: {
          blue: 'http://demo-images.andalin.com/saas/623b79d0f6cc0ceb93ee39e3317f9299394b2e050232ef5632576826c74b27a5.png',
          grey: 'http://demo-images.andalin.com/saas/d2edf42ffdc2c9154ce049a63197c647eacd41d0ada1708fc8eee7c47a580980.png',
          red: 'https://demo-images.andalin.com/saas/dbf8ecb2f672eefb6c2abf2b432f52bf4a9b231fe568948dde0cff28db49ddd6.png',
        },
        DEPARTURE: {
          blue: {
            Ocean:
              'http://demo-images.andalin.com/saas/f0d2006ad3db218f4d1b445117a3e7439769b9c3279bcaa907a7793573c55250.png',
            Air: 'http://demo-images.andalin.com/saas/1d81eb1674dc89ad3654f1471c47c92e1fada4c78f13208c7e7d8c4d7c97f4f0.png',
          },
          grey: {
            Ocean:
              'http://demo-images.andalin.com/saas/8f1bd8c52d1b0c3ce62f1bd918b262a65e139b596ff182db19371d01d1757cfc.png',
            Air: 'http://demo-images.andalin.com/saas/6b231156f4fe9c13994eaef9581fdda4541bf412efb1031ce3009800ba0d8ffe.png',
          },
          red: {
            Ocean:
              'https://demo-images.andalin.com/saas/e30af964b4cff5574dcade51a8ce2294273c2f88787bd92dc57ccd415644fd2e.png',
            Air: 'http://demo-images.andalin.com/saas/523b47e70c33c08a3513f21b0a6949c3edb1f83876343e3e2115590b6ddcadb1.png',
          },
        },
        ARRIVAL: {
          blue: {
            Ocean:
              'http://demo-images.andalin.com/saas/99e3e35b7d605843247f174a7b4582fa8980b4babbe97b0f80ff0c33acec80c0.png',
            Air: 'http://demo-images.andalin.com/saas/39d416ffe1f524938790f9c67353b3f97c07c92893911b67304f72bd9cbe4612.png',
          },
          grey: {
            Ocean:
              'http://demo-images.andalin.com/saas/3c40ef35eb839f10b5aa6fb542fd32c5438298e9873ba60e54ed786b95857f30.png',
            Air: 'http://demo-images.andalin.com/saas/5464fefdf1ea802f67a1e0002937118cc3c523e97a96fb953acc9d8df8a41ae9.png',
          },
        },
        DESTINATION_LOCAL_HANDLING: {
          blue: 'http://demo-images.andalin.com/saas/7e4066a278e38d71f5d2bb5987fdd35fa399578f5021da8f2438f799781580ac.png',
          grey: 'http://demo-images.andalin.com/saas/fa2432d4372ad370afe080675ebfa1357c4da00da827cd2e1e117a5b7998fc20.png',
        },
        DELIVERY: {
          blue: 'http://demo-images.andalin.com/saas/72a6d59e0d1c76ff4d0a79f907bd41151f39ebadee8fe3e86611566a8201937f.png',
          grey: 'http://demo-images.andalin.com/saas/c42f5d6f90f44304920ffb2026596a07a704576c53e9f2951bef2c4b23ec9037.png',
        },
        COMPLETE: {
          blue: 'http://demo-images.andalin.com/saas/f30096d2edd00fdf799f20d424114f0e2c9f2974d8f07111fbe95c0b3b1617ab.png',
          grey: 'http://demo-images.andalin.com/saas/668a47d4a68302e116cfe81c83c63ab4203ce191bde0fcce70ce583c95befe38.png',
        },
      },
      'Port to Port': {
        BOOKED: {
          blue: 'https://demo-images.andalin.com/saas/537fa2c8c7345733ab638c036db5424d6d620a7a3a5a1a65ec41ca16305eeb7c.png',
          grey: 'http://demo-images.andalin.com/saas/9f8b648ad8ff107ceda6dcd17833bb7379b8593649e838f67501745fdf6c14fb.png',
          red: 'https://demo-images.andalin.com/saas/07e56d3bd272c6b4b1fa5d48a2788ca7c39fbfe99bc157178e131172d4458bfb.png',
        },
        SCHEDULED: {
          blue: 'http://demo-images.andalin.com/saas/623b79d0f6cc0ceb93ee39e3317f9299394b2e050232ef5632576826c74b27a5.png',
          grey: 'http://demo-images.andalin.com/saas/d2edf42ffdc2c9154ce049a63197c647eacd41d0ada1708fc8eee7c47a580980.png',
          red: 'https://demo-images.andalin.com/saas/dbf8ecb2f672eefb6c2abf2b432f52bf4a9b231fe568948dde0cff28db49ddd6.png',
        },
        DEPARTURE: {
          blue: {
            Ocean:
              'http://demo-images.andalin.com/saas/f0d2006ad3db218f4d1b445117a3e7439769b9c3279bcaa907a7793573c55250.png',
            Air: 'http://demo-images.andalin.com/saas/1d81eb1674dc89ad3654f1471c47c92e1fada4c78f13208c7e7d8c4d7c97f4f0.png',
          },
          grey: {
            Ocean:
              'http://demo-images.andalin.com/saas/8f1bd8c52d1b0c3ce62f1bd918b262a65e139b596ff182db19371d01d1757cfc.png',
            Air: 'http://demo-images.andalin.com/saas/6b231156f4fe9c13994eaef9581fdda4541bf412efb1031ce3009800ba0d8ffe.png',
          },
          red: {
            Ocean:
              'https://demo-images.andalin.com/saas/e30af964b4cff5574dcade51a8ce2294273c2f88787bd92dc57ccd415644fd2e.png',
            Air: 'http://demo-images.andalin.com/saas/523b47e70c33c08a3513f21b0a6949c3edb1f83876343e3e2115590b6ddcadb1.png',
          },
        },
        ARRIVAL: {
          blue: {
            Ocean:
              'http://demo-images.andalin.com/saas/99e3e35b7d605843247f174a7b4582fa8980b4babbe97b0f80ff0c33acec80c0.png',
            Air: 'http://demo-images.andalin.com/saas/39d416ffe1f524938790f9c67353b3f97c07c92893911b67304f72bd9cbe4612.png',
          },
          grey: {
            Ocean:
              'http://demo-images.andalin.com/saas/3c40ef35eb839f10b5aa6fb542fd32c5438298e9873ba60e54ed786b95857f30.png',
            Air: 'http://demo-images.andalin.com/saas/5464fefdf1ea802f67a1e0002937118cc3c523e97a96fb953acc9d8df8a41ae9.png',
          },
        },
        COMPLETE: {
          blue: 'http://demo-images.andalin.com/saas/f30096d2edd00fdf799f20d424114f0e2c9f2974d8f07111fbe95c0b3b1617ab.png',
          grey: 'http://demo-images.andalin.com/saas/668a47d4a68302e116cfe81c83c63ab4203ce191bde0fcce70ce583c95befe38.png',
        },
      },
    };

    const result = [];
    let flag = 'blue';
    for (let otif in otifs[shipmentService]) {
      if (otif === OtifStatus.COMPLETE) {
        result.push({
          otif,
          otifIcon: otifs[shipmentService][otif][flag],
        });
      } else if (otif === OtifStatus.DEPARTURE || otif === OtifStatus.ARRIVAL) {
        result.push({
          line:
            otif === otifStatus || otif === previousOtifStatus ? 'grey' : flag,
          lineIcon:
            otif === otifStatus || otif === previousOtifStatus
              ? line.grey
              : line[flag],
          otif,
          otifIcon:
            otif === previousOtifStatus
              ? otifs[shipmentService][otif]['red'][shipmentVia]
              : otifs[shipmentService][otif][flag][shipmentVia],
        });
      } else {
        result.push({
          line:
            otif === otifStatus || otif === previousOtifStatus ? 'grey' : flag,
          lineIcon:
            otif === otifStatus || otif === previousOtifStatus
              ? line.grey
              : line[flag],
          otif,
          otifIcon:
            otif === previousOtifStatus
              ? otifs[shipmentService][otif]['red']
              : otifs[shipmentService][otif][flag],
        });
      }

      if (otif === otifStatus || otif === previousOtifStatus) {
        flag = 'grey';
      }
    }

    return result;
  }

  compareDifferentValue(obj1, obj2, excludeField?) {
    for (const field of excludeField) {
      delete obj1[field];
      delete obj2[field];
    }
    const diff = [];

    for (const i in obj2) {
      const values = this.validateValueCompare(obj1[i], obj2[i]);
      if (!obj1.hasOwnProperty(i) || values.value1 != values.value2) {
        diff.push(i);
      }
    }
    return diff;
  }

  validateValueCompare(value1, value2) {
    if (value1 === null) {
      value1 = '';
    }
    if (value2 === null) {
      value2 = '';
    }

    value1 = typeof value1 === 'string' ? value1.trim().toUpperCase() : value1;
    value2 = typeof value2 === 'string' ? value2.trim().toUpperCase() : value2;

    return {
      value1,
      value2,
    };
  }

  numberToWordsId(num) {
    let numbers = [];
    let b = num.toString();
    numbers = b.split('.');

    let result = [];
    numbers.forEach((number) => {
      result.push(this.numToWordsId(Number(number)));
    });

    return result.join(' point ');
  }

  numToWordsId(a) {
    if(a == 0) return 'Nol'
    var bilangan = [
      '',
      'Satu',
      'Dua',
      'Tiga',
      'Empat',
      'Lima',
      'Enam',
      'Tujuh',
      'Delapan',
      'Sembilan',
      'Sepuluh',
      'Sebelas',
    ];

    // 1 - 11
    if (a < 12) {
      var kalimat = bilangan[a];
    }
    // 12 - 19
    else if (a < 20) {
      var kalimat = bilangan[a - 10] + ' Belas';
    }
    // 20 - 99
    else if (a < 100) {
      var utama = a / 10;
      var depan = parseInt(String(utama).substr(0, 1));
      var belakang = a % 10;
      var kalimat = bilangan[depan] + ' Puluh ' + bilangan[belakang];
    }
    // 100 - 199
    else if (a < 200) {
      var kalimat = 'Seratus ' + this.numToWordsId(a - 100);
    }
    // 200 - 999
    else if (a < 1000) {
      var utama = a / 100;
      var depan = parseInt(String(utama).substr(0, 1));
      var belakang = a % 100;
      var kalimat = bilangan[depan] + ' Ratus ' + this.numToWordsId(belakang);
    }
    // 1,000 - 1,999
    else if (a < 2000) {
      var kalimat = 'Seribu ' + this.numToWordsId(a - 1000);
    }
    // 2,000 - 9,999
    else if (a < 10000) {
      var utama = a / 1000;
      var depan = parseInt(String(utama).substr(0, 1));
      var belakang = a % 1000;
      var kalimat = bilangan[depan] + ' Ribu ' + this.numToWordsId(belakang);
    }
    // 10,000 - 99,999
    else if (a < 100000) {
      var utama = a / 100;
      var depan = parseInt(String(utama).substr(0, 2));
      var belakang = a % 1000;
      var kalimat =
        this.numToWordsId(depan) + ' Ribu ' + this.numToWordsId(belakang);
    }
    // 100,000 - 999,999
    else if (a < 1000000) {
      var utama = a / 1000;
      var depan = parseInt(String(utama).substr(0, 3));
      var belakang = a % 1000;
      var kalimat =
        this.numToWordsId(depan) + ' Ribu ' + this.numToWordsId(belakang);
    }
    // 1,000,000 - 	99,999,999
    else if (a < 100000000) {
      var utama = a / 1000000;
      var depan = parseInt(String(utama).substr(0, 4));
      var belakang = a % 1000000;
      var kalimat =
        this.numToWordsId(depan) + ' Juta ' + this.numToWordsId(belakang);
    } else if (a < 1000000000) {
      var utama = a / 1000000;
      var depan = parseInt(String(utama).substr(0, 4));
      var belakang = a % 1000000;
      var kalimat =
        this.numToWordsId(depan) + ' Juta ' + this.numToWordsId(belakang);
    } else if (a < 10000000000) {
      var utama = a / 1000000000;
      var depan = parseInt(String(utama).substr(0, 1));
      var belakang = a % 1000000000;
      var kalimat =
        this.numToWordsId(depan) + ' Milyar ' + this.numToWordsId(belakang);
    } else if (a < 100000000000) {
      var utama = a / 1000000000;
      var depan = parseInt(String(utama).substr(0, 2));
      var belakang = a % 1000000000;
      var kalimat =
        this.numToWordsId(depan) + ' Milyar ' + this.numToWordsId(belakang);
    } else if (a < 1000000000000) {
      var utama = a / 1000000000;
      var depan = parseInt(String(utama).substr(0, 3));
      var belakang = a % 1000000000;
      var kalimat =
        this.numToWordsId(depan) + ' Milyar ' + this.numToWordsId(belakang);
    } else if (a < 10000000000000) {
      var utama = a / 10000000000;
      var depan = parseInt(String(utama).substr(0, 1));
      var belakang = a % 10000000000;
      var kalimat =
        this.numToWordsId(depan) + ' Triliun ' + this.numToWordsId(belakang);
    } else if (a < 100000000000000) {
      var utama = a / 1000000000000;
      var depan = parseInt(String(utama).substr(0, 2));
      var belakang = a % 1000000000000;
      var kalimat =
        this.numToWordsId(depan) + ' Triliun ' + this.numToWordsId(belakang);
    } else if (a < 1000000000000000) {
      var utama = a / 1000000000000;
      var depan = parseInt(String(utama).substr(0, 3));
      var belakang = a % 1000000000000;
      var kalimat =
        this.numToWordsId(depan) + ' Triliun ' + this.numToWordsId(belakang);
    } else if (a < 10000000000000000) {
      var utama = a / 1000000000000000;
      var depan = parseInt(String(utama).substr(0, 1));
      var belakang = a % 1000000000000000;
      var kalimat =
        this.numToWordsId(depan) + ' Kuadriliun ' + this.numToWordsId(belakang);
    }
    var pisah = kalimat.split(' ');
    var full = [];
    for (var i = 0; i < pisah.length; i++) {
      if (pisah[i] != '') {
        full.push(pisah[i]);
      }
    }

    return full.join(' ');
  }

  numberToWordsEn(num) {
    let numbers = [];
    let b = num.toString();
    numbers = b.split('.');

    let result = [];
    numbers.forEach((number) => {
      result.push(this.numToWordsEn(Number(number)));
    });

    return result.join(' point ');
  }

  numToWordsEn(NumIn) {
    if (NumIn == 0) return 'Zero';
    var Ones = [
        '',
        'One',
        'Two',
        'Three',
        'Four',
        'Five',
        'Six',
        'Seven',
        'Eight',
        'Nine',
        'Ten',
        'Eleven',
        'Twelve',
        'Thirteen',
        'Fourteen',
        'Fifteen',
        'Sixteen',
        'Seventeen',
        'Eighteen',
        'Nineteen',
      ],
      Tens = [
        '',
        '',
        'Twenty',
        'Thirty',
        'Forty',
        'Fifty',
        'Sixty',
        'Seventy',
        'Eighty',
        'Ninety',
      ],
      Scale = [
        '',
        'Thousand',
        'Million',
        'Billion',
        'Trillion',
        'Quadrillion',
        'Quintillion',
        'Sextillion',
        'Septillion',
        'Octillion',
        'Nonillion',
        'Decillion',
      ],
      N1,
      N2,
      Sep,
      j,
      i,
      h,
      Trplt,
      tns = '',
      NumAll = '';
    NumIn += ''; // Make NumIn a String
    NumIn = '0'.repeat((NumIn.length * 2) % 3) + NumIn; //Create shortest string triplets 0 padded
    j = 0; //Start with the highest triplet from LH
    for (i = NumIn.length / 3 - 1; i >= 0; i--) {
      //Loop thru number of triplets from LH most
      Trplt = NumIn.substring(j, j + 3); //Get a triplet number starting from LH
      if (Trplt != '000') {
        //Skip empty trplets
        Sep = Trplt[2] != '0' ? '-' : ' '; //Dash only for 21 to 99
        N1 = Number(Trplt[0]); //Get Hundreds digit
        N2 = Number(Trplt.substr(1)); //Get 2 lowest digits (00 to 99)
        tns =
          N2 > 19
            ? Tens[Number(Trplt[1])] + Sep + Ones[Number(Trplt[2])]
            : Ones[N2];
        NumAll +=
          ((h = N1 > 0 ? Ones[N1] + ' Hundred' : '') + ' ' + tns).trim() +
          ' ' +
          Scale[i] +
          ' ';
      }
      j += 3; //Next lower triplets (move to RH)
    }

    return NumAll.trim();
  }

  getNextOtif(shipmentService: string, otifStatus: OtifStatus) {
    const otifs = [
      OtifStatus.REJECTED,
      OtifStatus.COMPLETE,
      OtifStatus.COMPLETE,
    ];

    if (otifs.includes(otifStatus)) {
      throw new BadRequestException();
    }

    const otifStatusData: { [key: string]: string[] } = {
      'Door to Door': [
        'BOOKED',
        'SCHEDULED',
        'PICKUP',
        'ORIGIN_LOCAL_HANDLING',
        'DEPARTURE',
        'ARRIVAL',
        'DESTINATION_LOCAL_HANDLING',
        'DELIVERY',
        'COMPLETE',
      ],
      'Door to Port': [
        'BOOKED',
        'SCHEDULED',
        'PICKUP',
        'ORIGIN_LOCAL_HANDLING',
        'DEPARTURE',
        'ARRIVAL',
        'COMPLETE',
      ],
      'Port to Door': [
        'BOOKED',
        'SCHEDULED',
        'DEPARTURE',
        'ARRIVAL',
        'DESTINATION_LOCAL_HANDLING',
        'DELIVERY',
        'COMPLETE',
      ],
      'Port to Port': [
        'BOOKED',
        'SCHEDULED',
        'DEPARTURE',
        'ARRIVAL',
        'COMPLETE',
      ],
    };

    const nextIndex = otifStatusData[shipmentService].indexOf(otifStatus) + 1;
    return otifStatusData[shipmentService][nextIndex];
  }

  camelToTitleCase(text){
    const result = text.replace(/([A-Z])/g, " $1");
    const finalResult = result.charAt(0).toUpperCase() + result.slice(1);
    return finalResult;
  }

  checkTypeData(value,type){
    if(type != 'array'){
      return ['number','integer'].includes(type) ? Number(value) : value;
    }else{
      return [];
    }
  }

  ceisaGenerateArrayData(importData,payload,sheetName,sheetNameList,parentSheet = null,parentSheetPrimary = null){
    const sheet = importData.getWorksheet(sheetName);
    sheet.spliceRows(1,1);
    const attribute = {};

    sheet.eachRow(function(row, rowNumber) {
      attribute[row.getCell(1).value.toString()] = row.getCell(2).value;
    });

    const sheetList = importData.getWorksheet(sheetNameList);

    for (let i = 2; i <= sheetList.rowCount; i++) {
      const row = sheetList.getRow(i);
      if(row.values.length > 0) {
        const dataItem = {};
        Object.keys(attribute).map((item,index)=>{
          const column = index + 1;
          const value = row.getCell(column).value ? row.getCell(column).value.toString() : '';
          dataItem[item] = this.checkTypeData(value,attribute[item]);
        })

        if(parentSheet){
          payload[parentSheet].map((item,index)=>{
            if(item[parentSheetPrimary] == dataItem[parentSheetPrimary]) payload[parentSheet][index][sheetName].push(dataItem);
          })
        }else{
          payload[sheetName].push(dataItem);
        }
      }
    }
  }

  appendJobSheetStatus(jobSheet){
    jobSheet.allStatus = [];

    Object.keys(JobSheetAllStatus).forEach(key =>{

      if(jobSheet.arStatus){
        Object.keys(jobSheet.arStatus).forEach(keyAr =>{
          if(keyAr+'_AR' == key){
            jobSheet.allStatus.push({
              type: JobSheetItemType.AR,
              key: keyAr,
              label: JobSheetAllStatus[key],
              value: jobSheet.arStatus[keyAr]
            });
          }
        })
      }

      if(jobSheet.apStatus){
        Object.keys(jobSheet.apStatus).forEach(keyAp =>{
          if(keyAp+'_AP' == key){
            jobSheet.allStatus.push({
              type: JobSheetItemType.AP,
              key: keyAp,
              label: JobSheetAllStatus[key],
              value: jobSheet.apStatus[keyAp]
            });
          }
        })
      }

    });

    return jobSheet;
  }
}
