import { BadRequestException, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosRequestConfig } from 'axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from "mongoose";
import { QiscusLogs, QiscusLogsDocument } from '../schemas/qiscusLogs.schema';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class QiscusService{
    constructor(
        private httpService: HttpService,
        private redisService: RedisService,
        @InjectModel(QiscusLogs.name) private qiscusLogsModel: Model<QiscusLogsDocument>,
    ){}

    /*async authenticate(){

        const payload = {
            url: process.env.QISCUS_URL+'/api/v1/auth',
            headers: {
                /!*'Content-Type' : 'application/json',
                'Authorization' : process.env.WABLAS_API_KEY*!/
            },
            request: {
                email:process.env.QISCUS_EMAIL,
                password:process.env.QISCUS_PASSWORD,
            },
            response:{},
            types:'QISCUS_AUTHENTICATE',
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

            await this.redisService.set('QISCUS_AUTH_TOKEN',result.data.data.user.authentication_token,2*24*3600);

            return result.data.data.user.authentication_token;
        } catch (error) {

            payload.response = error.response.data;
            payload.endTime = new Date();

            this.createLog(payload);

            throw error
        }
    }*/

    async sendMessage(phoneNumber: string, data:any, fileName: string){

        const template = {
            namespace:process.env.QISCUS_QUOTATION_TEMPLATE_NAMESPACE,
            name:process.env.QISCUS_QUOTATION_TEMPLATE_NAME
        }

        const parameters = [
            {
                type: "text",
                text: data.companyName
            },
            {
                type: "text",
                text: data.shipmentVia
            },
            {
                type: "text",
                text: data.countryFrom
            },
            {
                type: "text",
                text: data.countryTo
            }
        ];

        const payload = {
            url: process.env.QISCUS_URL+`/whatsapp/v1/${process.env.QISCUS_APP_ID}/${process.env.QISCUS_CHANNEL_ID}/messages`,
            headers: {
                'Content-Type' : 'application/json',
                'Qiscus-App-Id' : process.env.QISCUS_APP_ID,
                'Qiscus-Secret-Key' : process.env.QISCUS_SECRET_KEY,
            },
            request: {
                type:"template",
                to:phoneNumber,
                template:{
                    namespace: template.namespace,
                    name: template.name,
                    language:{
                        policy:"deterministic",
                        code:"en",
                    },
                    components:[
                        {
                            type: "body",
                            parameters
                        },
                        {
                          type: "button",
                          sub_type: "url",
                          index: "0",
                          parameters:[
                            {
                              type: "text",
                              text: fileName
                            }
                          ]
                        },
                    ]
                },
            },
            response:{},
            types:'QISCUS_SEND_WA',
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
        const seaRatesLogs = new this.qiscusLogsModel({...body});
        seaRatesLogs.save();
    }
}