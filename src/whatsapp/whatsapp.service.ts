import { Injectable, Res, HttpStatus } from "@nestjs/common";
import { HttpService } from '@nestjs/axios';
import { AxiosRequestConfig } from 'axios';
import { Response } from 'express';
@Injectable()
export class WhatsappService{
    constructor(
        private httpService: HttpService
    ){}

    send(phone: string, message: string){
        try {
            const axiosConfig: AxiosRequestConfig = {
                method: 'post',
                url: process.env.WABLAS_URL,
                headers: { Authorization: process.env.WABLAS_API_KEY },
                data: { phone, message },
                validateStatus: (status: number) => status === 200,
            };

            this.httpService.request(axiosConfig).toPromise()
        } catch (error) {
            throw error
        }
    }
}