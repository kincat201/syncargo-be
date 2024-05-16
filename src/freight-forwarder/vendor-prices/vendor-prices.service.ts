import { BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { getRepository, Repository, Connection, Not } from 'typeorm';
import { CreateVendorPriceDto } from './dtos/create-vendor-price.dto';
import { VendorPrice } from '../../entities/vendor-price.entity';
import { VendorPriceComponent } from '../../entities/vendor-price-component.entity';

@Injectable()
export class VendorPricesService {
  constructor(
    @InjectRepository(VendorPrice) private vendorPriceRepo: Repository<VendorPrice>,
    @InjectRepository(VendorPriceComponent) private vendorPriceComponentRepo: Repository<VendorPriceComponent>,
    private connection: Connection,
  ) {}

  async getAll(companyId: number,countryFrom = null, countryTo = null, cityFrom = null, cityTo = null, shipmentType = null) {
    let condition = { companyId,  status: 1 };

    if(countryFrom) Object.assign(condition,{countryFromId:countryFrom});
    if(countryTo) Object.assign(condition,{countryToId:countryTo});
    if(cityFrom) Object.assign(condition,{cityFrom});
    if(cityTo) Object.assign(condition,{cityTo});
    if(shipmentType) Object.assign(condition,{shipmentType});

    return await this.vendorPriceRepo.find(condition);
  }

  async getPaged(
    companyId: number,
    page: number, 
    perpage: number, 
    filter: string, 
    sort: string,
    countryFrom = null,
    countryTo = null,
    cityFrom = null,
    cityTo = null,
    shipmentType = null,
  ) {
    try{
      const limit = perpage;
      const offset = perpage * (page - 1);

      let query = getRepository(VendorPrice)
        .createQueryBuilder('vp')
        .leftJoinAndSelect('vp.priceComponents', 'pc', 'pc.status = :status', { status: 1 })
        .where('vp.companyId = :companyId', { companyId })
        .select([
          'vp.id',
          'vp.countryFrom',
          'vp.cityFrom',
          'vp.countryTo',
          'vp.cityTo',
          'vp.shipmentType',
          'vp.vendorName',
          'vp.label',
          'vp.currency',
          'vp.status',
          'vp.updatedAt',
          'pc.id',
          'pc.price',
          'pc.uom',
          'pc.note',
          'pc.profit',
          'pc.total',
          'pc.priceCompName',
        ]);

      const totalCount = await query.getCount()
      if (!totalCount) {
        throw new HttpException('No content', HttpStatus.NO_CONTENT);
      }

      if(countryFrom) query.where('vp.countryFromId = :countryFromId',{countryFromId:countryFrom});
      if(countryTo) query.where('vp.countryToId = :countryToId',{countryToId:countryTo});
      if(cityFrom) query.where('vp.cityFrom = :cityFrom',{cityFrom});
      if(cityTo) query.where('vp.cityTo = :cityTo',{cityTo});
      if(shipmentType) query.where('vp.shipmentType = :shipmentType',{shipmentType});

      if (filter){
        query = query.andWhere(
          `(
            vp.countryFrom like :filter OR 
            vp.cityFrom like :filter OR 
            vp.countryTo like :filter OR 
            vp.cityTo like :filter OR 
            vp.shipmentType like :filter OR 
            vp.vendorName like :filter OR 
            vp.label like :filter
          )`,
          { filter: `%${filter}%` },
        );
      }

      if (sort && (sort === "ASC" || sort === "DESC")){
        query.orderBy('vp.countryFrom', sort);
      } else {
        query.orderBy('vp.updatedAt', 'DESC');
      }

      const allData = await query.getMany();
      const totalRecord = allData.length;

      query.groupBy('vp.id,pc.id');

      const data = await query.take(limit).skip(offset).getMany();
      const totalShowed = data.length

      return {
        page,
        totalRecord,
        totalShowed,
        totalPage: Math.ceil(totalRecord / limit),
        showing: `${totalRecord === 0 ? 0 : offset + 1} - ${
          offset + totalShowed
        } of ${totalRecord}`,
        next: offset + totalShowed !== totalRecord,
        data,
      };
    } catch (err) {
      throw err;
    }
  }

  async getDetail(companyId: number, id: number) {
    try{
      const vendorPrice = await getRepository(VendorPrice)
        .createQueryBuilder('vp')
        .leftJoinAndSelect('vp.priceComponents', 'pc', 'pc.status = :status', { status: 1 })
        .select([
          'vp.id',
          'vp.countryFrom',
          'vp.countryFromCode',
          'vp.countryFromId',
          'vp.cityFrom',
          'vp.countryTo',
          'vp.countryToCode',
          'vp.countryToId',
          'vp.cityTo',
          'vp.shipmentType',
          'vp.vendorName',
          'vp.label',
          'vp.currency',
          'vp.status',
          'pc.price',
          'pc.uom',
          'pc.note',
          'pc.profit',
          'pc.total',
          'pc.priceCompName',
        ])
        .where('vp.id = :id AND vp.companyId = :companyId', { id, companyId })
        .getOne()

      if (vendorPrice == null) {
        throw new NotFoundException('Vendor Price not found')
      }
      return vendorPrice
    } catch (err) {
      throw err;
    }
  }

  async save(companyId: number, id: number, body: CreateVendorPriceDto) {
    try{

      const priceComponents = body.priceComponents;

      delete body.priceComponents;

      body.cityFrom = body.cityFrom ? body.cityFrom : 'All Cities';
      body.cityTo = body.cityTo ? body.cityTo : 'All Cities';

      let vendorPrice;let vendorPriceComponent;

      const conditionDuplicateLabel = { label: body.label, companyId };

      if(id) Object.assign(conditionDuplicateLabel,{id: Not(id)});

      const duplicateLabel = await this.vendorPriceRepo.count(conditionDuplicateLabel);
      if (duplicateLabel) {
        throw new BadRequestException('Label already exists');
      }

      vendorPrice = await this.vendorPriceRepo.findOne({ id, companyId, });

      if(!vendorPrice){
        vendorPrice = await this.vendorPriceRepo.create({ ...body, companyId});
      }else{
        Object.assign(vendorPrice,{...body});
        vendorPriceComponent = await this.vendorPriceComponentRepo.find({vendorPriceId:vendorPrice.id});
      }

      return await this.connection.transaction(async (entityManager) => {

        if(vendorPriceComponent){
          vendorPriceComponent.forEach((el) => {
            el.status = 0
          });
          await entityManager.save(vendorPriceComponent) // soft delete
        }

        const savedVendorPrice = await entityManager.save(vendorPrice);

        priceComponents.forEach((el)=>{
          el['vendorPriceId'] = savedVendorPrice.id;
        })

        const newPriceComponents = await this.vendorPriceComponentRepo.create(priceComponents);
        const savedPriceComponents = await this.vendorPriceComponentRepo.save(newPriceComponents);

        return Object.assign(savedVendorPrice, { priceComponents: savedPriceComponents });

      });
    } catch (err) {
      throw err;
    }
  }

  async hideOrShow(companyId: number, id: number) {
    try{
      const vendorPrice = await this.vendorPriceRepo.findOne({ id, companyId });
      if (!vendorPrice) {
        throw new NotFoundException('Vendor Price not found');
      }

      vendorPrice.status = vendorPrice.status ? 0 : 1

      return await this.vendorPriceRepo.save(vendorPrice);

    } catch (err) {
      throw err;
    } 
  }
}
