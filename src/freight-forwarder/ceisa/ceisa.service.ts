import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosRequestConfig } from 'axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CeisaExport, CeisaExportDocument } from '../../schemas/ceisaExport.schema';
import { CeisaImport, CeisaImportDocument } from '../../schemas/ceisaImport.schema';
import { RedisService } from '../../redis/redis.service';
import { CeisaLogs, CeisaLogsDocument } from '../../schemas/ceisaLogs.schema';
import { Helper } from '../helpers/helper';
import { CurrentUserDto } from '../auth/dtos/current-user.dto';
import { Workbook } from 'exceljs';
import * as tmp from 'tmp-promise';
import { InjectRepository } from '@nestjs/typeorm';
import { Shipment } from '../../entities/shipment.entity';
import { Repository } from 'typeorm';
import { CeisaAccessTokenExpired, RouteType } from '../../enums/enum';
import { UploadCeisaDto } from '../shipments/dtos/upload-ceisa.dto';
import * as crypto from 'crypto';
import { S3Service } from '../../s3/s3.service';
import { format } from "date-fns";
import { readFile, writeFile } from 'fs/promises';

@Injectable()
export class CeisaService {
    constructor(
        private httpService: HttpService,
        private redisService: RedisService,
        private s3Service: S3Service,
        private helper: Helper,
        @InjectRepository(Shipment) private shipmentRepo: Repository<Shipment>,

        @InjectModel(CeisaExport.name) private ceisaExportModel: Model<CeisaExportDocument>,
        @InjectModel(CeisaImport.name) private ceisaImportModel: Model<CeisaImportDocument>,
        @InjectModel(CeisaLogs.name) private ceisaLogsModel: Model<CeisaLogsDocument>,
    ){}

    async downloadCeisa(user: CurrentUserDto, rfqNumber: string) {

        const data = await this.shipmentRepo
          .createQueryBuilder('s')
          .innerJoin('s.customer', 'c')
          .innerJoin('s.quotation', 'q')
          .where(
            `
                s.rfqNumber = :rfqNumber
                AND q.status = :status
                AND q.companyId = :companyId
            `,
          )
          .select([
              's',
              'c.companyName',
              'q',
          ])
          .setParameters({
              rfqNumber,
              companyId: user.companyId,
              status: 1,
          })
          .getOne();

        if(!data){
            throw new NotFoundException('Shipment not found');
        }

        const type = data.quotation.routeType;
        if(type == RouteType.DOMESTIC) throw new BadRequestException('Only for route type Export or Import!');

        const defaultData = {
            asalData: 'S',
            idPengguna: user.userId,
            namaTtd: user.fullName,
            //nomorAju: 'SYN'+data.rfqNumber.replace(/[^\w\s]/gi,''),
            seri: 0,
        }

        const generalColumn = [
            'Attribute',
            'Value (Isi Bagian Ini)',
            'Type',
            'Required',
            'Description',
            'Message',
            'Enum',
        ];

        const generalColumnList = [
            'Attribute',
            'Type',
            'Required',
            'Description',
            'Message',
            'Enum',
        ];

        const rows ={
            header:[generalColumn],
            barang:[generalColumnList],
            barangList:[],
            barangDokumen:[generalColumnList],
            barangDokumenList:[],
            barangPemilik:[generalColumnList],
            barangPemilikList:[],
            barangTarif:[generalColumnList],
            barangTarifList:[],
        }

        const section = {
            main: 'header',
            good: 'barang',
            goodPrice: 'barangTarif',
            goodDocument: 'barangDokumen',
            goodOwner: 'barangPemilik',
            cover: 'kemasan',
            container: 'kontainer',
            document: 'dokumen',
            carrier: 'pengangkut',
            bank: 'bankDevisa',
            goodReadiness: 'kesiapanBarang',
            goodSpecSpecial: 'barangSpekKhusus',
            goodVd: 'barangVd',
            entityOwner: 'entitasPemilik',
            entityExport: 'entitasExportir',
            entityReceiver: 'entitasPenerima',
            entityBuyer: 'entitasPembeli',
            entityPPJK: 'entitasPPJK',
            entityImport: 'entitasImportir',
            entitySender: 'entitasPengirim',
            entitySeller: 'entitasPenjual',
            entityCenter: 'entitasPemusatan',
        }

        const rowsList = {
            barang:'barangList',
            barangTarif:'barangTarifList',
            barangDokumen:'barangDokumenList',
            barangPemilik:'barangPemilikList',
            kemasan:'kemasanList',
            kontainer:'kontainerList',
            dokumen:'dokumenList',
            pengangkut:'pengangkutList',
            bankDevisa:'bankDevisaList',
            kesiapanBarang:'kesiapanBarangList',
            barangSpekKhusus:'barangSpekKhususList',
            barangVd:'barangVdList',
        }

        let ceisaField;

        if(type == RouteType.EXPORT){
            Object.assign(rows,{
                entitasExportir:[generalColumn],
                entitasPemilik:[generalColumn],
                entitasPenerima:[generalColumn],
                entitasPembeli:[generalColumn],
                entitasPPJK:[generalColumn],
            })
            ceisaField = await this.ceisaExportModel.find();
        }else if(type == RouteType.IMPORT){
            Object.assign(rows,{
                barangSpekKhusus:[generalColumnList],
                barangSpekKhususList:[],
                barangVd:[generalColumnList],
                barangVdList:[],
                entitasImportir:[generalColumn],
                entitasPemilik:[generalColumn],
                entitasPengirim:[generalColumn],
                entitasPenjual:[generalColumn],
                entitasPemusatan:[generalColumn],
                entitasPPJK:[generalColumn],
            })
            ceisaField = await this.ceisaImportModel.find();
        }

        Object.assign(rows,{
            kemasan:[generalColumnList],
            kemasanList:[],
            kontainer:[generalColumnList],
            kontainerList:[],
            dokumen:[generalColumnList],
            dokumenList:[],
            pengangkut:[generalColumnList],
            pengangkutList:[],
        })

        if(type == RouteType.EXPORT){
            Object.assign(rows,{
                bankDevisa:[generalColumnList],
                bankDevisaList:[],
                kesiapanBarang:[generalColumnList],
                kesiapanBarangList:[],
            })
        }

        for (const item of ceisaField){
            let itemValue = '';
            if(defaultData[item.attribute]) itemValue = defaultData[item.attribute];
            if(item.type == 'array') itemValue = 'Mohon lakukan pengisian pada sheet '+ item.attribute;

            if(rowsList[section[item.section]]){
                if(item.type != 'array'){
                    if(rows[rowsList[section[item.section]]].length > 0){
                        rows[rowsList[section[item.section]]][0].push(item.attribute);
                    }else{
                        rows[rowsList[section[item.section]]].push([item.attribute]);
                    }
                }
                rows[section[item.section]].push([
                    item.attribute,
                    item.type,
                    item.required ? 'true' : 'false',
                    item.description ? item.description : '-',
                    item.message ? item.message : '-',
                    item.enum ? item.enum : '-',
                ]);
            }else{
                rows[section[item.section]].push([
                    item.attribute,
                    itemValue,
                    item.type,
                    item.required ? 'true' : 'false',
                    item.description ? item.description : '-',
                    item.message ? item.message : '-',
                    item.enum ? item.enum : '-',
                ]);
            }
        }

        rows['dokumenList'][0].push('Keterangan');

        if(type == RouteType.EXPORT){
            rows['dokumenList'].push(['','380','','','','','','','Dokumen Invoice sesuai formulir BC 3.0 - F.27',]); //document invoice
            rows['dokumenList'].push(['','217','','','','','','','Dokumen Packing List sesuai formulir BC 3.0 - F.28',]); //document packing list
            rows['dokumenList'].push(['','','','','','','','','Dokumen pelengkap lainnya dalam pengajuan dokumen ekspor sesuai formulir BC 3.0 - F.29',]); //document packing list
        }else if(type == RouteType.IMPORT){
            rows['dokumenList'].push(['','380','','','','','','','Dokumen Invoice sesuai formulir BC 2.0 - D.15',]); //document invoice
            rows['dokumenList'].push(['','704','','','','','','','Dokumen House-BL/AWB sesuai formulir BC 2.0 - D.17',]); //document House-BL/AWB
            rows['dokumenList'].push(['','740','','','','','','','Dokumen House-BL/AWB sesuai formulir BC 2.0 - D.17',]); //document House-BL/AWB
            rows['dokumenList'].push(['','','','','','','','','Dokumen Pemenuhan Persyaratan/Fasilitas Impor sesuai formulir BC 2.0 - D.19',]); //document Persyaratan/Fasilitas Impor
        }

        const workbook = new Workbook();

        Object.keys(rows).forEach(key =>{
            let properties = {}
            if(!rowsList[key]) properties = {properties:{tabColor:{argb:'ffff00'}}};

            const newSheet = workbook.addWorksheet(key,properties);
            newSheet.addRows(rows[key]);
            newSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
            newSheet
              .getRows(2, rows[key].length)
              .forEach(
                (row) => {
                    row.alignment = { vertical: 'middle', horizontal: 'left' };
                    if(row.getCell(4).value == 'true') {
                        row.getCell(1).fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFA500' },
                            bgColor: { argb: 'FFA500' }
                        }
                    }
                },
              );

            const sheetColumns = [];

            rows[key][0].map( headerKey =>{
                sheetColumns.push( { header: this.helper.camelToTitleCase(headerKey), key: headerKey});
            })

            newSheet.columns = sheetColumns;

            newSheet.columns.forEach((column) => {
                let maxLength = 0;
                column['eachCell']({ includeEmpty: true }, function (cell) {
                    const columnLength = cell?.value?.toString()?.length ?? 0;
                    if (columnLength > maxLength) {
                        maxLength = columnLength;
                    }
                });
                column.width = maxLength + 4;
            });

            // give column background colour

            if(!rowsList[key] && !key.includes('List')){
                newSheet.getRow(1).getCell(2).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'ffff00' },
                    bgColor: { argb: 'ffff00' }
                }
            }else if(key.includes('List')){
                newSheet.getRow(1).eachCell((column)=>{
                    column.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'ffff00' },
                        bgColor: { argb: 'ffff00' }
                    }
                })
            }

        });

        const { path: excelFile } = await tmp.file({
            discardDescriptor: true,
            prefix: 'Ceisa4.0_'+type,
            postfix: '.xlsx',
            mode: parseInt('0600', 8),
        });

        await workbook.xlsx.writeFile(excelFile);
        return excelFile;
    }

    async uploadCeisa(user: CurrentUserDto, file: Express.Multer.File, rfqNumber: string, body: UploadCeisaDto) {
        const shipment = await this.shipmentRepo
          .createQueryBuilder('s')
          .innerJoin('s.customer', 'c')
          .innerJoin('s.quotation', 'q')
          .where(
            `
                s.rfqNumber = :rfqNumber
                AND q.status = :status
                AND q.companyId = :companyId
            `,
          )
          .select([
              's',
              'c.companyName',
              'q',
          ])
          .setParameters({
              rfqNumber,
              companyId: user.companyId,
              status: 1,
          })
          .getOne();

        if(!shipment) throw new NotFoundException('Shipment not found');

        if(shipment.isCeisa && shipment.ceisaField.isFinal == "true") throw new NotFoundException('Only can update ceisa document draft!');

        const type = shipment.quotation.routeType;
        if(type == RouteType.DOMESTIC) throw new BadRequestException('Only for route type Export or Import!');

        const payload = {};

        const workbook = new Workbook();
        const importData = await workbook.xlsx.load(file.buffer);

        // section header

        const header = importData.getWorksheet('header');
        for (let i = 2; i <= header.rowCount; i++) {
            const row = header.getRow(i);
            if(row.values.length > 0) payload[row.getCell(1).value.toString()] = this.helper.checkTypeData(row.getCell(2).value ? row.getCell(2).value.toString() : "",row.getCell(3).value.toString());
        }

        if(payload['nomorAju'] !== body.nomorAju) throw new BadRequestException('Nomor Aju on excel and from input is not match, please check again!');

        // section good
        this.helper.ceisaGenerateArrayData(importData,payload,'barang','barangList');
        this.helper.ceisaGenerateArrayData(importData,payload,'barangTarif','barangTarifList','barang','seriBarang');
        this.helper.ceisaGenerateArrayData(importData,payload,'barangDokumen','barangDokumenList','barang','seriBarang');
        this.helper.ceisaGenerateArrayData(importData,payload,'barangPemilik','barangPemilikList','barang','seriBarang');

        // section entity

        let entitas = [];

        if(type == RouteType.IMPORT){
            this.helper.ceisaGenerateArrayData(importData,payload,'barangVd','barangVdList','barang','seriBarang');
            this.helper.ceisaGenerateArrayData(importData,payload,'barangSpekKhusus','barangSpekKhususList','barang','seriBarang');
            entitas = ['entitasImportir','entitasPemilik','entitasPengirim','entitasPenjual','entitasPemusatan','entitasPPJK',];
        }else{
            entitas = ['entitasExportir','entitasPemilik','entitasPenerima','entitasPembeli','entitasPPJK',];
        }

        Object.keys(entitas).map(key =>{
            const entity = importData.getWorksheet(entitas[key]);
            if(entity){
                const itemEntity = {};
                for (let i = 2; i <= entity.rowCount; i++) {
                    const row = entity.getRow(i);
                    if(row.values.length > 0) {
                        itemEntity[row.getCell(1).value.toString()] = this.helper.checkTypeData(row.getCell(2).value ? row.getCell(2).value.toString(): "",row.getCell(3).value.toString());
                    }
                }
                payload['entitas'].push(itemEntity);
            }
        })

        // section other

        this.helper.ceisaGenerateArrayData(importData,payload,'kemasan','kemasanList');
        this.helper.ceisaGenerateArrayData(importData,payload,'kontainer','kontainerList');
        this.helper.ceisaGenerateArrayData(importData,payload,'dokumen','dokumenList');
        this.helper.ceisaGenerateArrayData(importData,payload,'pengangkut','pengangkutList');

        if(type == RouteType.EXPORT){
            this.helper.ceisaGenerateArrayData(importData,payload,'bankDevisa','bankDevisaList');
            this.helper.ceisaGenerateArrayData(importData,payload,'kesiapanBarang','kesiapanBarangList');
        }

        payload['rfqNumber'] = shipment.rfqNumber;

        if(!shipment.ceisaField) shipment.ceisaField = {};

        try {
            const sendDocument = await this.sendDocument(payload, user);

            //Do Upload Document

            const fileExt = '.' + file.originalname.split('.').pop();
            const hashedFileName = `${crypto.randomBytes(32).toString('hex')}${fileExt}`;
            const upload = {
                file,
                fileExt,
                hashedFileName,
            };

            shipment.isCeisa = true;
            Object.assign(shipment.ceisaField,{...body, idHeader: sendDocument.response['idHeader']});

            await this.s3Service.uploadFiles([upload]);

            const fileContainer = 'saas';
            const fileName = upload.hashedFileName;

            if(!shipment.ceisaField.documents) shipment.ceisaField.documents = [];
            shipment.ceisaField.documents.push({
                orginalName: file.originalname.toString(),
                url:`${process.env.URL_S3}/${fileContainer}/${fileName}`,
                creator: user.fullName,
                createdAt: format(new Date(),'yyyy-MM-dd HH:mm:ss')
            })

            await this.shipmentRepo.save(shipment);

        }catch (e) {
            console.log(e);
            if(e.Exception){
                throw new BadRequestException(e.Exception);
            }else if(e.message){
                throw new BadRequestException(e.message);
            }else{
                throw new BadRequestException('Trouble on server CEISA, try again later!');
            }
        }

        return payload;
    }

    async authenticate(){

        const getAccessToken = await this.redisService.get('CEISA_ACCESS_TOKEN');
        if(getAccessToken) return getAccessToken;

        const payload = {
            url: process.env.NLE_URL+'/auth-amws/v1/user/login',
            headers: {
                'Content-Type' : 'application/json',
                //'Authorization' : process.env.WABLAS_API_KEY
            },
            request: {
                username:process.env.NLE_USERNAME,
                password:process.env.NLE_PASSWORD,
            },
            response:{},
            types:'CEISA_AUTHENTICATE',
            startTime: new Date(),
            endTime: new Date(),
        }

        try {
            const axiosConfig: AxiosRequestConfig = {
                method: 'post',
                url: payload.url,
                headers: payload.headers,
                data: payload.request,
            };

            const result = await this.httpService.request(axiosConfig).toPromise();

            payload.response = result.data;
            payload.endTime = new Date();

            this.createLog(payload);
            await this.redisService.set('CEISA_ACCESS_TOKEN',result.data.item.access_token,CeisaAccessTokenExpired);

            return result.data.item.access_token;
        } catch (error) {

            payload.response = error.response.data;
            payload.endTime = new Date();

            this.createLog(payload);

            throw error
        }
    }

    async sendDocument(body:any, user: CurrentUserDto){

        const accessToken = await this.redisService.get('CEISA_ACCESS_TOKEN_'+user.userId);
        if(!accessToken) throw new BadRequestException('ceisa auth token is not found, please login to NLE first!');

        const payload = {
            url: process.env.NLE_URL+`/openapi/document`,
            headers: {
                'Content-Type' : 'application/json',
                'Authorization' : 'Bearer '+accessToken,
            },
            request: body,
            response:{},
            types:'CEISA_SEND_DOCUMENT',
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

            return payload;
        } catch (error) {

            payload.response = error.response.data;
            payload.endTime = new Date();

            this.createLog(payload);

            throw error.response.data;
        }
    }

    async getAjuStatus(nomorAju:string, user: CurrentUserDto){

        const accessToken = await this.redisService.get('CEISA_ACCESS_TOKEN_'+user.userId);
        if(!accessToken) throw new BadRequestException('ceisa auth token is not found, please login to NLE first!');

        const payload = {
            url: process.env.NLE_URL+'/openapi/status/'+nomorAju,
            headers: {
                'Content-Type' : 'application/json',
                'Authorization' : 'Bearer '+accessToken,
            },
            request: {
                nomorAju,
            },
            response:{},
            types:'CEISA_AJU_STATUS',
            startTime: new Date(),
            endTime: new Date(),
        }

        try {
            const axiosConfig: AxiosRequestConfig = {
                method: 'get',
                url: payload.url,
                headers: payload.headers,
            };

            const result = await this.httpService.request(axiosConfig).toPromise();

            payload.response = result.data;
            if(!result.data.dataStatus){
                if(!result.data.message){
                  result.data.message = 'CEISA 4.0 : Server CEISA error, please try again later! ';
                }else{
                  result.data.message = 'CEISA 4.0 : '+result.data.message;
                }
                throw new BadRequestException(result.data);
            }
            payload.endTime = new Date();

            this.createLog(payload);

            return payload.response;
        } catch (error) {

            payload.response = error.response;
            payload.endTime = new Date();

            this.createLog(payload);

            throw error
        }
    }

    async detailCeisa(rfqNumber:string, user: CurrentUserDto){
        const shipment = await this.shipmentRepo
          .createQueryBuilder('s')
          .innerJoin('s.customer', 'c')
          .innerJoin('s.quotation', 'q')
          .where(
            `
                s.rfqNumber = :rfqNumber
                AND s.isCeisa = 1
                AND q.status = :status
                AND q.companyId = :companyId
            `,
          )
          .select([
              's',
              'c.companyName',
              'q',
          ])
          .setParameters({
              rfqNumber,
              companyId: user.companyId,
              status: 1,
          })
          .getOne();

        if(!shipment) throw new NotFoundException('Shipment not found');

        try {
            const getStatusAju = await this.getAjuStatus(shipment.ceisaField.nomorAju,user);

            return {
                isCeisa: shipment.isCeisa,
                ceisaField: shipment.ceisaField,
                ceisaDocument: getStatusAju
            }
        } catch (error) {
            throw error
        }
    }

    async downloadPdf(rfqNumber:string, path:string, user: CurrentUserDto){
      const shipment = await this.shipmentRepo
        .createQueryBuilder('s')
        .innerJoin('s.customer', 'c')
        .innerJoin('s.quotation', 'q')
        .where(
          `
                s.rfqNumber = :rfqNumber
                AND q.status = :status
                AND q.companyId = :companyId
            `,
        )
        .select([
            's',
            'c.companyName',
            'q',
        ])
        .setParameters({
            rfqNumber,
            companyId: user.companyId,
            status: 1,
        })
        .getOne();

        if(!shipment) throw new NotFoundException('Shipment not found');

        //const accessToken = await this.authenticate();

        const accessToken = await this.redisService.get('CEISA_ACCESS_TOKEN_'+user.userId);
        if(!accessToken) throw new BadRequestException('ceisa auth token is not found, please login to NLE first!');

        const payload = {
          url: process.env.NLE_URL+'/openapi/download-respon?path='+path,
          headers: {
            'Content-Type' : 'application/json',
            'Authorization' : 'Bearer '+accessToken,
          },
          response:{},
          types:'CEISA_DOWNLOAD_PDF',
          startTime: new Date(),
          endTime: new Date(),
        }

        try {
          const axiosConfig: AxiosRequestConfig = {
            method: 'get',
            url: payload.url,
            headers: payload.headers,
            responseType: 'stream',
          };

          const result = await this.httpService.request(axiosConfig).toPromise();

          //payload.response = result.data;
          payload.endTime = new Date();

          this.createLog(payload);

          return result.data;
        } catch (error) {
            console.log(error);

          payload.response = error.response.data;
          payload.endTime = new Date();

          this.createLog(payload);

          throw error
        }
    }

    createLog(body){
        const logs = new this.ceisaLogsModel({...body});
        logs.save();
    }
}