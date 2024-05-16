import {
  Injectable,
  Res,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosRequestConfig } from 'axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SearatesLogsDocument,
  SearatesLogs,
} from '../../schemas/searatesLogs.schema';
import { GetScheduleDto } from './dtos/get-schedule.dto';
import { CurrentUserDto } from '../auth/dtos/current-user.dto';

@Injectable()
export class ShippingLineService {
  constructor(
    private httpService: HttpService,
    @InjectModel(SearatesLogs.name)
    private seaRatesLogsModel: Model<SearatesLogsDocument>,
  ) {}

  async searchPort(name: string) {
    const payload = {
      url: process.env.SEARATES_URL + '/routeAutocomplete',
      headers: {
        /*'Content-Type' : 'application/json',
                'Authorization' : process.env.WABLAS_API_KEY*/
      },
      request: {
        name,
      },
      response: {},
      types: 'SEARATES_GET_PORTS',
      startTime: new Date(),
      endTime: new Date(),
    };

    try {
      const axiosConfig: AxiosRequestConfig = {
        method: 'get',
        url: payload.url,
        params: {
          name: payload.request.name,
        },
      };

      const result = await this.httpService.request(axiosConfig).toPromise();

      payload.response = result.data.response;
      payload.endTime = new Date();

      const response = [];

      result.data.response.map((item, key) => {
        if (key < 4) {
          response.push({
            name: item.name,
            countryCode: item.countryCode,
            codes: item.codesList[0],
          });
        }
      });

      return response;
    } catch (error) {
      payload.response = error.response.data;
      payload.endTime = new Date();

      this.createLog(payload);

      throw error;
    }
  }

  async searchSchedule(user: CurrentUserDto, body: GetScheduleDto) {
    if (
      [
        'ONEY',
        'COSU',
        'OOLU',
        'MAEU',
        'SEJJ, MCCQ, SEAU',
        'YMLU',
        'HLCU',
      ].includes(body.sealine)
    ) {
      if (body.serviceModeFrom) {
        body['service_mode_from'] = body.serviceModeFrom;
      }

      if (body.serviceModeFrom) {
        body['service_mode_to'] = body.serviceModeTo;
      }
      //throw new BadRequestException('service mode from and to required!');
    }

    delete body.serviceModeFrom;
    delete body.serviceModeTo;

    const payload = {
      url: process.env.SEARATES_URL,
      headers: {
        /*'Content-Type' : 'application/json',
                'Authorization' : process.env.WABLAS_API_KEY*/
      },
      request: {
        ...body,
        userId: user.userId,
      },
      response: {},
      types: 'SEARATES_GET_SCHEDULES',
      startTime: new Date(),
      endTime: new Date(),
    };

    try {
      const axiosConfig: AxiosRequestConfig = {
        method: 'get',
        url: payload.url,
        params: {
          ...body,
          apiKey: process.env.SEARATES_API_KEY,
        },
      };

      const result = await this.httpService.request(axiosConfig).toPromise();

      payload.response = result.data.response;
      payload.endTime = new Date();

      this.createLog(payload);

      return result.data.response;
    } catch (error) {
      payload.response = error.response.data;
      payload.endTime = new Date();

      this.createLog(payload);

      throw error;
    }
  }

  createLog(body) {
    const seaRatesLogs = new this.seaRatesLogsModel({ ...body });
    seaRatesLogs.save();
  }
}
