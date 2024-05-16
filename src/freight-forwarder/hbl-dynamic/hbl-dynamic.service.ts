import { Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, Repository } from 'typeorm';
import { S3Service } from '../../s3/s3.service';
import { Company } from '../../entities/company.entity';
import { Shipment } from '../../entities/shipment.entity';
import { HblDynamicHistory } from '../../entities/hbl-dynamic-history.entity';
import { HblDynamicImages } from '../../entities/hbl-dynamic-images.entity';
import { CurrentUserDto } from '../auth/dtos/current-user.dto';
import { SaveHblDynamicDto } from './dtos/save-hbl-dynamic.dto';
import { createReadStream } from 'fs';
import { join } from 'path';
import { EAffiliation } from '../../enums/enum';

@Injectable()
export class HblDynamicService {
  constructor(
    @InjectRepository(Company) private companyRepo: Repository<Company>,
    @InjectRepository(Shipment) private shipmentRepo: Repository<Shipment>,
    @InjectRepository(HblDynamicHistory) private hblDynamicHistoryRepo: Repository<HblDynamicHistory>,
    @InjectRepository(HblDynamicImages) private hblDynamicImageRepo: Repository<HblDynamicImages>,
    private connection: Connection,
    private s3Service: S3Service,
  ) {}

  async getHblDynamic(user: CurrentUserDto, rfqNumber:string, isReset:any ){
    const { companyId } = user;

    const company = await this.companyRepo.findOne({
      where:{
        id:companyId,
        status:1,
      }
    })
    if(!company) throw new NotFoundException('Company not found!');

    if(rfqNumber){
      const shipment = await this.shipmentRepo
        .createQueryBuilder('s')
        .innerJoinAndSelect('s.quotation', 'q')
        .leftJoinAndSelect('q.company', 'company')
        .where(
          `
        s.rfqNumber = :rfqNumber
        AND s.status = :status
        AND ${
            !user.isTrial
              ? `q.companyId = :companyId`
              : `(q.companyId = :companyId OR q.affiliation = :dummyAffiliation)`
            }
        AND q.status = :status
      `)
        .setParameters({
          rfqNumber,
          companyId: user.companyId,
          status: 1,
          dummyAffiliation: EAffiliation.DUMMY,
        })
        .getOne();

      if(!shipment) throw new NotFoundException('Shipment not found!');

      if(shipment.hblDynamic) return shipment.hblDynamic;
    }

    if(company.hblDynamic && (!isReset || isReset == 'false')) return company.hblDynamic;

    const file = createReadStream(join(process.cwd(), 'src/freight-forwarder/hbl-dynamic/hbl-dynamic-default.json'));

    return new StreamableFile(file);
  }

  async saveHblDynamic(user: CurrentUserDto, body: SaveHblDynamicDto){
    const { userId, companyId } = user;
    const { rfqNumber } = body;
    const condition = { companyId };
    let activity = 'Create HBL Template';
    let shipment = null;

    const company = await this.companyRepo.findOne({
      where:{
        id:companyId,
        status:1,
      }
    })
    if(!company) throw new NotFoundException('Company not found!');

    if(rfqNumber){
      condition['rfqNumber'] = rfqNumber;
      shipment = await this.shipmentRepo
        .createQueryBuilder('s')
        .innerJoinAndSelect('s.quotation', 'q')
        .leftJoinAndSelect('q.company', 'company')
        .where(
          `
        s.rfqNumber = :rfqNumber
        AND s.status = :status
        AND ${
            !user.isTrial
              ? `q.companyId = :companyId`
              : `(q.companyId = :companyId OR q.affiliation = :dummyAffiliation)`
            }
        AND q.status = :status
      `)
        .setParameters({
          rfqNumber,
          companyId: user.companyId,
          status: 1,
          dummyAffiliation: EAffiliation.DUMMY,
        })
        .getOne();

      if(!shipment) throw new NotFoundException('Shipment not found!');
    }else{
      condition['rfqNumber'] = null;
    }

    if(await this.hblDynamicHistoryRepo.findOne({ where: condition })) activity = 'Edit HBL Template';

    const hblDynamicHistory = await this.hblDynamicHistoryRepo.create({
      companyId,
      rfqNumber,
      activity,
      status: 1,
      createdByUserId: userId,
    });

    return await this.connection.transaction(async (entityManager) => {

      await entityManager.save(hblDynamicHistory);

      if(rfqNumber){
        shipment.hblDynamic = body.content;
        shipment.hblDynamicDefault = body.hblDynamicDefault;
        await entityManager.save(shipment);
      }else{
        company.hblDynamic = body.content;
        await entityManager.save(company);
      }

      return body;
    });

  }

  async uploadFile(
    upload: any,
    user: CurrentUserDto,
    ){

    const { companyId, userId } = user;

    await this.s3Service.uploadFiles([upload]);

    const fileContainer = 'saas';
    const fileName = upload.hashedFileName;

    const hblDynamicImage = this.hblDynamicImageRepo.create({
      companyId,
      fileContainer,
      fileName,
      originalName: upload.file.originalname,
      url: `${process.env.URL_S3}/${fileContainer}/${fileName}`,
      status:1,
      createdByUserId:userId,
    });

    return await this.connection.transaction(async (entityManager) => {

      return await entityManager.save(hblDynamicImage);

    });

  }

}
