import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';

import { OcrDocumentHistory } from '../../entities/ocr-document-history.entity';
import { Company } from '../../entities/company.entity';
import { User } from '../../entities/user.entity';

import { UsersService } from '../users/users.service';
import { S3Service } from '../../s3/s3.service';
import { CompaniesService } from '../companies/companies.service';


import { Connection, EntityManager, Repository, Not, IsNull } from 'typeorm';
import { CurrentUserDto } from '../auth/dtos/current-user.dto';
import { OcrDocumentUpdateRequestDto } from './dtos/ocr-doc-update.dto';

import axios from 'axios';
import { OcrDocument } from 'src/entities/ocr-document.entity';
import { OcrConvertedDataDto } from './dtos/ocr-doc-converted-data.dto';

@Injectable()
export class OcrService {
    constructor(
        @InjectRepository(OcrDocument)
        private ocrDocumentRepo: Repository<OcrDocument>,
        @InjectRepository(OcrDocumentHistory)
        private OcrDocumentHistoryRepo: Repository<OcrDocumentHistory>,
        private connection : Connection,
        private userService : UsersService,
        private s3Service: S3Service,
        private companyService: CompaniesService,
    ){}
    
    async findOcrDocById(user : CurrentUserDto, id : number) : Promise<any> {
        const { companyId, userId } = user;
        const ocr = await this.ocrDocumentRepo.createQueryBuilder("ocr")
        .innerJoin("ocr.ocrDocumentHistory", "ocrh")
        .innerJoin("ocrh.user", "ocrhu")
        .select([
            "ocr.id",
            "ocr.url",
            "ocr.fileName",
            "ocr.originalName",
            "ocr.fileSize",
            "ocr.formatFile",
            "ocr.fileContainer",
            "ocr.convertedData",
            "ocr.createdAt",
            "ocr.createdBy",
            "ocr.updatedAt",
            "ocr.updatedBy",
            "ocrh.activity",
            "ocrh.createdAt",
            "ocrh.createdBy",
            "ocrhu.role",
            "ocrhu.fullName"
            // "ocrh.role",
        ])
        .where(
            `
                ocr.companyId = :companyId
                AND ocr.id = :id
                AND ocr.deletedBy IS NULL
                AND ocr.deletedAt IS NULL 
                AND ocr.status = 1
            `
        ).setParameters({
            companyId,
            id,
        })
        .getOne();
        if (!ocr) return null
        const l = ocr.ocrDocumentHistory;
        let sortedDsc : any;
        if (l){
            sortedDsc = l.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }else{
            sortedDsc = null;
        }

        const convertedDataAsc = await this.sortConvertData(ocr.convertedData);
        const res = {
            id : ocr.id,
            url : ocr.url,
            fileName : ocr.fileName,
            originalName : ocr.originalName,
            fileSize : ocr.fileSize,
            formatFile : ocr.formatFile,
            fileContainer : ocr.fileContainer,
            convertedData : convertedDataAsc,
            createdAt : ocr.createdAt,
            updatedAt : ocr.updatedAt,
            createdBy : ocr.createdBy,
            updatedBy : ocr.updatedBy,
            ocrDocumentHistory : sortedDsc,
        }
        return res;
    }

    async getOcrDocumentDetail(user : CurrentUserDto, id : number) : Promise<any> {
        const ocr = await this.findOcrDocById(user, id);
        if (!ocr) throw new NotFoundException(' Data Not Found!');
        return ocr;
    }

    async getAllOcrDocument(user : CurrentUserDto) : Promise<any> {
        
        const ocrs = await this.ocrDocumentRepo.createQueryBuilder("ocr")
            .innerJoin("ocr.ocrDocumentHistory", "ocrh")
            .innerJoin("ocrh.user", "ocrhu")
            .select([
                "ocr.id",
                "ocr.url",
                "ocr.originalName",
                "ocr.fileSize",
                "ocr.formatFile",
                "ocr.updatedAt",
                "ocr.updatedBy",
                "ocrh.activity",
                "ocrh.createdAt",
                "ocrh.createdBy",
                "ocrhu.role",
                "ocrhu.fullName"
            ])
            .where(
                `
                    ocr.companyId = :companyId
                    AND ocr.deletedBy IS NULL
                    AND ocr.deletedAt IS NULL
                    AND ocr.convertedData IS NOT NULL
                    AND ocr.status = :activeStatus   
                `
            ).setParameters(
                {
                    companyId : user.companyId,
                    activeStatus : 1,
                }
            )
            .orderBy("ocr.updatedAt", "DESC")
            .getMany();
        
        if (!ocrs) throw new NotFoundException(' There`s no data found!');
        const numberOfData = ocrs.length;

        const ocrDocuments = ocrs.map((el) => {
            const res = {
                ...el,
                activity : null,
                role : null,
                fullName : null,
            }
            const hist = el.ocrDocumentHistory;
            let sortedDsc : OcrDocumentHistory[];
            if (hist){
                sortedDsc = hist.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            }else{
                sortedDsc = null;
            }
            if (sortedDsc){
                res.activity = sortedDsc[0].activity;
                res.role = sortedDsc[0].user.role;
                res.fullName = sortedDsc[0].user.fullName;
            }
            delete res.ocrDocumentHistory;
            return res;
        });

        return {
            numberOfData,
            data : ocrDocuments,
        };    
    }

    async getOcrDocumentCurrent(user : CurrentUserDto) : Promise<any>{
        // terakhir di upload dan belum di convert
        // left join ke company sama userId
        const { companyId } = user;
        const ocrs = await this.ocrDocumentRepo
            .createQueryBuilder('ocr')
            .where('ocr.deletedBy IS NULL')
            .andWhere('ocr.deletedAt IS NULL')
            .andWhere('ocr.status = :activeStatus', { activeStatus : 1})
            .andWhere('ocr.convertedData IS NULL')
            .andWhere('ocr.companyId = :companyId', {companyId})
            .orderBy('ocr.createdAt', 'DESC')
            .getOne();
        return ocrs;
    }

    async uploadOcrDocument(user : CurrentUserDto, file: Express.Multer.File) : Promise<any> {

        const { userId, companyId } = user;
        if (!file){
            throw new NotFoundException(
                'ocr file is empty',
            );
        }
        const originalName = file.originalname;
        const ext = originalName.split(".").pop();
        const mimeType = file.mimetype;
        const fileSize = file.size;
        const buffer = file.buffer;
        const fileName = `${crypto.randomBytes(32).toString('hex')}.${ext}`;
        const formatFile = mimeType.split("/").pop();
        const fileContainer = "saas";
        const ocrData = {
            mimeType,
            fileName,
            buffer,
        };

        const url = await this.s3Service.uploadOcrDocument(ocrData);
        
        const ocrDoc = {
            ...ocrData,
            fileSize,
            originalName,
            formatFile,
            fileContainer,
            url,
            createdBy : userId,
            updatedBy : userId,
            convertedData : null,
            companyId
        };
        const newOcrDoc = await this.ocrDocumentRepo.create(ocrDoc)
        return await this.connection.transaction(async (entityManager) => {
            const ocrDeletes = await entityManager
                .createQueryBuilder()
                .update(OcrDocument)
                .set({ status: 0, deletedAt : Date(), deletedBy : user.userId })
                .where(
                    `
                companyId = :companyId
                AND status = :activeStatus
                AND deletedAt IS NULL
                AND deletedBy IS NULL
                AND convertedData IS NULL
                `,
                )
                .setParameters({
                    companyId : user.companyId,
                    activeStatus : 1,
                })
                .execute();
            const ocr = await entityManager.save(newOcrDoc);
            
            // const role = user.role;
            
            const ocrHistory = {
                activity : "Create OCR",
                convertedData : null,
                createdBy : userId,
                ocrDocumentId : ocr.id,
            }
            const newOcrHis = await this.OcrDocumentHistoryRepo.create(ocrHistory);
            const ocrHis = await entityManager.save(newOcrHis);
            return ocr;
          });
    }   

    async convertOcrDocument(user : CurrentUserDto, id : number) : Promise<any> {
        // convert data yang belum pernah di convert (send to other service)
        const ocr = await this.ocrDocumentRepo.findOne({
            where : {
                id,
                companyId : user.companyId,
                deletedAt : IsNull(),
                deletedBy : IsNull(),
                status : 1,
            }
        });
        if (!ocr) throw new NotFoundException("Ocr Not Found");
        ocr.updatedAt = new Date();
        ocr.updatedBy = user.userId;
        const convOcr = await this.sendToOcrService(ocr.url);
        if (!convOcr) throw new Error("error ocr service");
        ocr.convertedData = convOcr;
        return this.connection.transaction(async (entityManager) => {
            await entityManager.save(ocr);
            
            // const role = user.role;
            const ocrHistory = {
                activity : "Convert OCR",
                // role,
                createdBy : user.userId,
                convertedData : convOcr,
                ocrDocumentId : ocr.id,
            };
            const newOcrHis = await this.OcrDocumentHistoryRepo.create(ocrHistory);
            await entityManager.save(newOcrHis);
            return ocr;
        }); 

    }


    async updateOcrDocument(user : CurrentUserDto, id : number, body : OcrDocumentUpdateRequestDto) {
        // update from body
        const ocr = await this.ocrDocumentRepo.findOne({
            where : {
                id,
                companyId : user.companyId,
                deletedAt : IsNull(),
                deletedBy : IsNull(),
                status : 1,
            }
        });
        if (!ocr) throw new NotFoundException("Ocr Not Found");

        ocr.convertedData = body;
        ocr.updatedAt = new Date();
        ocr.updatedBy = user.userId;
        return this.connection.transaction(async (entityManager) => {
            
            await entityManager.save(ocr);
            // const role = user.role;
            const ocrHistory = {
                activity : "Update OCR",
                createdBy : user.userId,
                ocrDocumentId : ocr.id,
                convertedData : body,
            };
            const newOcrHis = await this.OcrDocumentHistoryRepo.create(ocrHistory);
            await entityManager.save(newOcrHis);
            return ocr;
        }); 
    }

    async sendToOcrService(url : string) : Promise<any> {
        const ocrServiceUrl = process.env.OCR_SERVICE_URL + "/v2/analyze/line";
        const requestBody = {
          url,
        };
        let dummy : any;
        try {
            const response = await axios.post(ocrServiceUrl, requestBody, {
                headers: {
                  'x-api-key': process.env.OCR_SERVICE_API_KEY,
                }
              });
            dummy = response.data;
            // console.log(response.data);
        } catch (error) {
            console.error(error);
            return null;
        }
        
        // convert response to string html
        const res = {
            numberOfPages : dummy.numberOfPages,
            pages : [],
        };
        dummy.pages.forEach(el => {
            const tmp = {
                page : el.page,
                lines : this.arrayToHtml(el.lines),
            };
            res.pages.push(tmp);
        });
        return res;
    }

    arrayToHtml(data : string[]) : string{
        // convert from array of string to html
        let res : string = "";
        data.forEach(el => {
            res += "<p>" + el + "</p>";
        });
        return res;
    }

    async deleteOcrDocument(user : CurrentUserDto, id : number) : Promise<any> {
        // soft delete 
        const ocr = await this.ocrDocumentRepo.findOne({
            where : {
                id,
                companyId : user.companyId,
                deletedAt : IsNull(),
                deletedBy : IsNull(),
                status : 1,
            }
        })
        if (!ocr) throw new NotFoundException("Ocr Not Found");
        ocr.deletedBy = user.userId;
        ocr.deletedAt = new Date();
        ocr.status = 0;
        return this.connection.transaction(async (entityManager) => {
            
            await entityManager.save(ocr);
            // const role = user.role;
            const ocrHistory = {
                activity : "Delete OCR",
                // role,
                createdBy : user.userId,
                ocrDocumentId : ocr.id,
            };
            const newOcrHis = await this.OcrDocumentHistoryRepo.create(ocrHistory);
            await entityManager.save(newOcrHis);
            return ocr;
        });    
    }

    async downloadOcrToDoc(user : CurrentUserDto, idOcr : number) : Promise<any> {
        // convert html to doc
        // handle multipage
        const activeUser = 1;
        const ocr = await this.ocrDocumentRepo.findOne({
            where : {
                id : idOcr,
                companyId : user.companyId,
                deletedAt : IsNull(),
                deletedBy : IsNull(),
                status : activeUser,
            }
        });
        if (!ocr) throw new NotFoundException("Ocr Not Found");
        if (!ocr.convertedData) throw new NotFoundException("Ocr Document have not been converted yet");            
        const listOfPages = ocr.convertedData.pages;

        const name = ocr.originalName;
        
        let fileOutName : string;
        const lastIdx = name.lastIndexOf('.');
        if (lastIdx !== -1){
            fileOutName = name.substring(0, lastIdx);
        }else{
            fileOutName = name;
        }

        listOfPages.sort((a, b) => a.page - b.page);
        let html : string = "";
        const tmp = '<br style="page-break-before: always; clear: both" /> <span style="display : none"><hr class="pb" style="display : none"> </span>';
        listOfPages.forEach(el => {
            html += "<div>" + el?.lines + "</div>" + tmp;
        });
        var header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' "+
            "xmlns:w='urn:schemas-microsoft-com:office:word' "+
            "xmlns='http://www.w3.org/TR/REC-html40'>"+
            "<head><meta charset='utf-8'><title>Export HTML to Word Document with JavaScript</title></head><body>";
        var postHtml = '</body></html>';
        var footer = "</body></html>";
        const soureHTML = header + html + footer;
        return {soureHTML, fileOutName};
    }

    async sortConvertData(convertedData : any) : Promise<any> {
        if (!convertedData) return null;
        const res = {
            pages : [],
            numberOfPages : convertedData.numberOfPages,
        };
        let sortedList : any = convertedData.pages;
        sortedList.sort((a, b) => a.page - b.page);
        res.pages = sortedList;
        return res;
    }
}