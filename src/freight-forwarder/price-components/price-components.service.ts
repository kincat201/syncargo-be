import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { getRepository, Repository, Not } from 'typeorm';
import { PriceComponent } from 'src/entities/price-component.entity';
import { CreatePriceComponentDto } from './dtos/create-price-component.dto';
import { UpdatePriceComponentDto } from './dtos/update-price-component.dto';

@Injectable()
export class PriceComponentsService {
  constructor(
    @InjectRepository(PriceComponent)
    private priceComponentRepo: Repository<PriceComponent>,
  ) {}

  async getAll(companyId: number, isTrial: boolean) {
    const whereStatement: any[] = [{ companyId, status: 1 }];
    if (isTrial) {
      whereStatement.push({ company: { affiliation: 'DUMMY' }, status: 1 });
    }
    return await this.priceComponentRepo.find({
      where: whereStatement,
      relations: ['company'],
    });
  }

  async getPaged(
    companyId: number,
    page: number,
    perpage: number,
    filter: string,
    sort: string,
    isTrial: boolean,
  ) {
    try {
      const limit = perpage;
      const offset = perpage * (page - 1);

      let whereStatement = 'pc.companyId = :companyId ';

      if (isTrial) {
        whereStatement += "OR c.affiliation = 'DUMMY'";
      }

      let query = getRepository(PriceComponent)
        .createQueryBuilder('pc')
        .innerJoin('pc.company', 'c')
        .where(whereStatement, {
          companyId,
        })
        .select(['pc.id', 'pc.code', 'pc.name', 'pc.status']);

      const totalCount = await query.getCount();
      if (!totalCount) {
        throw new HttpException('No content', HttpStatus.NO_CONTENT);
      }

      if (filter) {
        query = query.andWhere(
          `(pc.code like :filter OR
            pc.name like :filter)`,
          { filter: `%${filter}%` },
        );
      }

      if (sort && (sort === 'ASC' || sort === 'DESC')) {
        query.orderBy('pc.name', sort);
      } else {
        query.orderBy('pc.updatedAt', 'DESC');
      }

      const allData = await query.getMany();
      const totalRecord = allData.length;

      const data = await query.limit(limit).offset(offset).getMany();
      const totalShowed = data.length;

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
    try {
      const priceComp = await getRepository(PriceComponent)
        .createQueryBuilder('pc')
        .select(['pc.id', 'pc.code', 'pc.name'])
        .where('pc.id = :id AND pc.companyId = :companyId', { id, companyId })
        .getOne();

      if (priceComp == null) {
        throw new NotFoundException('Price Component not found');
      }
      return priceComp;
    } catch (err) {
      throw err;
    }
  }

  async create(
    companyId: number,
    userId: number,
    data: CreatePriceComponentDto,
  ) {
    try {
      const duplicateCode = await this.priceComponentRepo.count({
        code: data.code,
        companyId,
      });
      if (duplicateCode) {
        throw new BadRequestException('Component Code already exists');
      }

      const duplicateName = await this.priceComponentRepo.count({
        name: data.name,
        companyId,
      });
      if (duplicateName) {
        throw new BadRequestException('Component Name already exists');
      }

      const priceComp = await this.priceComponentRepo.create({
        ...data,
        createdBy: userId,
        companyId,
      });
      return await this.priceComponentRepo.save(priceComp);
    } catch (err) {
      throw err;
    }
  }

  async update(
    companyId: number,
    userId: number,
    id: number,
    data: UpdatePriceComponentDto,
  ) {
    try {
      const priceComp = await this.priceComponentRepo.findOne({
        id,
        companyId,
      });
      if (!priceComp) {
        throw new NotFoundException('Price Component not found');
      }

      const duplicateCode = await this.priceComponentRepo.count({
        code: data.code,
        companyId,
        id: Not(id),
      });
      if (duplicateCode) {
        throw new BadRequestException('Component Code already exists');
      }

      const duplicateName = await this.priceComponentRepo.count({
        name: data.name,
        companyId,
        id: Not(id),
      });
      if (duplicateName) {
        throw new BadRequestException('Component Name already exists');
      }

      Object.assign(priceComp, { ...data, updatedBy: userId });
      return await this.priceComponentRepo.save(priceComp);
    } catch (err) {
      throw err;
    }
  }

  async hideOrShow(companyId: number, userId: number, id: number) {
    try {
      const priceComp = await this.priceComponentRepo.findOne({
        id,
        companyId,
      });
      if (!priceComp) {
        throw new NotFoundException('Price Component not found');
      }

      if (priceComp.status) {
        priceComp.status = 0;
        priceComp.deletedBy = userId;
        priceComp.deletedAt = new Date();
      } else {
        priceComp.status = 1;
      }

      return await this.priceComponentRepo.save(priceComp);
    } catch (err) {
      throw err;
    }
  }
}
