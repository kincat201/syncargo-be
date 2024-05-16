import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosRequestConfig } from 'axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from "mongoose";
import { QontakLogs, QontakLogsDocument } from '../schemas/qontakLogs.schema';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class QontakService{
    constructor(
        private httpService: HttpService,
        private redisService: RedisService,
        @InjectModel(QontakLogs.name) private qontakLogsModel: Model<QontakLogsDocument>,
    ){}

    async authenticate(){

        const getAccessToken = await this.redisService.get('QONTAK_ACCESS_TOKEN');
        if(getAccessToken) return getAccessToken;

        const payload = {
            url: process.env.QONTAK_URL+'/oauth/token',
            headers: {
                /*'Content-Type' : 'application/json',
                'Authorization' : process.env.WABLAS_API_KEY*/
            },
            request: {
                username:process.env.QONTAK_USERNAME,
                password:process.env.QONTAK_PASSWORD,
                grant_type:process.env.QONTAK_GRANT_TYPE,
                client_id:process.env.QONTAK_CLIENT_ID,
                client_secret:process.env.QONTAK_CLIENT_SECRET,
            },
            response:{},
            types:'QONTAK_AUTHENTICATE',
            startTime: new Date(),
            endTime: new Date(),
        }

        try {
            const axiosConfig: AxiosRequestConfig = {
                method: 'post',
                url: payload.url,
                params: payload.request,
            };

            const result = await this.httpService.request(axiosConfig).toPromise();

            payload.response = result.data;
            payload.endTime = new Date();

            this.createLog(payload);

            await this.redisService.set('QONTAK_ACCESS_TOKEN',result.data.access_token,result.data.expires_in);

            return result.data.access_token;
        } catch (error) {

            payload.response = error.response.data;
            payload.endTime = new Date();

            this.createLog(payload);

            throw error
        }
    }

    async shareWAQuotation(phoneNumber: string, data:any, fileName: string){

        const template = {
            message_template_id : process.env.QONTAK_QUOTATION_TEMPLATE_ID,
            channel_integration_id : process.env.QONTAK_CHANNEL_INTEGRATION_ID,
            language:{
                code: process.env.QONTAK_QUOTATION_TEMPLATE_LANGUAGE
            }
        }

        const content = {
            body:[
                {
                    key: "1",
                    value_text: data.companyName,
                    value: 'company_name',
                },
                {
                    key: "2",
                    value_text: data.shipmentVia,
                    value: 'shipment_via',
                },
                {
                    key: "3",
                    value_text: data.countryFrom,
                    value: 'country_from',
                },
                {
                    key: "4",
                    value_text: data.countryTo,
                    value: 'country_to',
                },
            ],
            buttons:[
                {
                    index: "0",
                    value: fileName,
                    type: 'url',
                },
            ]
        };

        const accessToken = await this.authenticate();

        const payload = {
            url: process.env.QONTAK_URL+`/api/open/v1/broadcasts/whatsapp/direct`,
            headers: {
                'Content-Type' : 'application/json',
                'Authorization' : 'Bearer '+accessToken,
            },
            request: {
                to_name : data.companyName,
                to_number : phoneNumber,
                ...template,
                parameters: content,
            },
            response:{},
            types:'QONTAK_SEND_WA_QUOTATION',
            startTime: new Date(),
            endTime: new Date(),
        }

        try {
            const axiosConfig: AxiosRequestConfig = {
                method: 'post',
                headers: payload.headers,
                url: payload.url,
                data: payload.request,
            };

            const result = await this.httpService.request(axiosConfig).toPromise();

            payload.response = result.data;
            payload.endTime = new Date();

            this.createLog(payload);

            return result.data;
        } catch (error) {

            payload.response = error.response.data.error;
            payload.endTime = new Date();

            this.createLog(payload);

            return error.response.data;
        }
    }

    createLog(body){
        const seaRatesLogs = new this.qontakLogsModel({...body});
        seaRatesLogs.save();
    }
}