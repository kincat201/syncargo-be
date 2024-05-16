import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosRequestConfig } from 'axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from "mongoose";
import { NleLogs, NleLogsDocument } from '../../schemas/nleLogs.schema';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class NleService{
    constructor(
      private httpService: HttpService,
      private redisService: RedisService,
      @InjectModel(NleLogs.name) private nleLogsModel: Model<NleLogsDocument>,
    ){}

    async requestToken(){

        const payload = {
            url: process.env.NLE_URL+'/nleportal/nleportalsvc/api/v1/auth/requestToken?key=' + process.env.NLE_PLATFORM_KEY,
            headers: {
                'Content-Type' : 'application/json',
                'nle-api-key' : process.env.NLE_API_KEY
            },
            request: {},
            response:{},
            types:'NLE_REQUEST_TOKEN_AUTH',
            startTime: new Date(),
            endTime: new Date(),
        }

        try {
            const axiosConfig: AxiosRequestConfig = {
                method: 'get',
                headers: payload.headers,
                url: payload.url
            };

            const result = await this.httpService.request(axiosConfig).toPromise();

            payload.response = result.data;
            payload.endTime = new Date();

            this.createLog(payload);

            return result.data.data;
        } catch (error) {

            payload.response = error.response.data;
            payload.endTime = new Date();

            this.createLog(payload);

            throw error
        }
    }

    async getUserInfo(accessToken){

        const payload = {
            url: process.env.NLE_URL+'/nle-oauth/v1/user/userinfo-token',
            headers: {
                'Content-Type' : 'application/json',
                'Authorization' : accessToken
            },
            request: {},
            response:{},
            types:'NLE_GET_USER_INFO',
            startTime: new Date(),
            endTime: new Date(),
        }

        try {
            const axiosConfig: AxiosRequestConfig = {
                method: 'get',
                headers: payload.headers,
                url: payload.url
            };

            const result = await this.httpService.request(axiosConfig).toPromise();

            payload.response = result.data;
            payload.endTime = new Date();

            this.createLog(payload);

            return result.data;
        } catch (error) {

            payload.response = error.response.data;
            payload.endTime = new Date();

            this.createLog(payload);

            if(error.response.status == 401) throw new HttpException("Invalid access token", HttpStatus.UNAUTHORIZED);

            throw new HttpException("Failed checking on NLE", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    createLog(body){
        const logs = new this.nleLogsModel({...body});
        logs.save();
    }
}