import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, Repository, getRepository, Not, MoreThan } from 'typeorm';

import { CreateOriginDestinationDto } from './dtos/create-origin-destination.dto';
import { UpdateOriginDestinationDto } from './dtos/update-origin-destination.dto';

import { OriginDestination } from 'src/entities/origin-destination.entity';
import { Country } from 'src/entities/country.entity';
import { CurrentUserDto } from '../auth/dtos/current-user.dto';
import { EAffiliation } from '../../enums/enum';

@Injectable()
export class OriginDestinationService {
  constructor(
    @InjectRepository(OriginDestination)
    private originDestinationRepo: Repository<OriginDestination>,
    @InjectRepository(Country) private countryRepo: Repository<Country>,
    private connection: Connection,
  ) {}

  async getAll(user: CurrentUserDto, companyId: number) {
    const condition: any[] = [{ companyId, status: 1 }];
    if (user.isTrial) {
      condition.push({ company: { affiliation: EAffiliation.TRIAL } });
    }
    return await this.originDestinationRepo.find({
      where: condition,
      relations: ['company'],
    });
  }

  async getPaged(
    companyId: number,
    page: number,
    perpage: number,
    filter: string,
    sort: string,
    user: CurrentUserDto,
  ) {
    try {
      const limit = perpage;
      const offset = perpage * (page - 1);

      let query = getRepository(OriginDestination)
        .createQueryBuilder('r')
        .where('r.companyId = :companyId', { companyId })
        .select([
          'r.id',
          'r.countryCode',
          'r.countryName',
          'r.cityCode',
          'r.cityName',
          'r.status',
        ]);

      if (user.isTrial) {
        query
          .innerJoinAndSelect('r.company', 'c')
          .andWhere('c.affiliation = :affiliation', {
            affiliation: EAffiliation.DUMMY,
          });
      }

      const totalCount = await query.getCount();
      if (!totalCount) {
        throw new HttpException('No content', HttpStatus.NO_CONTENT);
      }

      if (filter) {
        query = query.andWhere(
          `(r.countryName like :filter OR
            r.countryCode like :filter OR
            r.cityCode like :filter OR
            r.cityName like :filter)`,
          { filter: `%${filter}%` },
        );
      }

      if (sort && (sort === 'ASC' || sort === 'DESC')) {
        query.orderBy('r.countryName', sort);
      } else {
        query.orderBy('r.updatedAt', 'DESC');
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

  async getDetail(companyId: number, id: number, user: CurrentUserDto) {
    try{
      let query = this.originDestinationRepo
        .createQueryBuilder('r')
        .select([
          'r.id',
          'r.countryCode',
          'r.countryName',
          'r.cityCode',
          'r.cityName',
        ])
        .where('r.id = :id AND r.companyId = :companyId', { id, companyId });

      if (user.isTrial) {
        query
          .innerJoinAndSelect('r.company', 'c')
          .andWhere('c.affiliation = :affiliation', {
            affiliation: EAffiliation.DUMMY,
          });
      }

      const route = await query.getOne();

      if (!route) {
        throw new NotFoundException('Origin Destination not found');
      }
      return route;
    } catch (err) {
      throw err;
    }
  }

  async create(
    companyId: number,
    userId: number,
    data: CreateOriginDestinationDto,
  ) {
    try {
      const duplicateRoute = await this.originDestinationRepo.count({
        ...data,
        companyId,
      });
      if (duplicateRoute) {
        throw new BadRequestException('Data already exists');
      }

      const duplicateCityCode = await this.originDestinationRepo.count({
        cityCode: data.cityCode,
        companyId,
      });
      if (duplicateCityCode) {
        throw new BadRequestException('City code already exists');
      }

      const duplicateCityName = await this.originDestinationRepo.count({
        countryName: data.countryName,
        cityName: data.cityName,
        companyId,
      });
      if (duplicateCityName) {
        throw new BadRequestException(
          'Data with the same city name already exists in the same country',
        );
      }

      const country = await this.countryRepo.findOne({
        countryCode: data.countryCode,
        companyId,
      });
      if (country && country.countryName !== data.countryName) {
        throw new BadRequestException('Country code already exists');
      } else if (!country) {
        const newCountry = await this.countryRepo.create({
          countryCode: data.countryCode,
          countryName: data.countryName,
          createdBy: userId,
          companyId,
        });
        await this.countryRepo.save(newCountry);
      }

      const routes = await this.originDestinationRepo.create({
        ...data,
        createdBy: userId,
        companyId,
      });
      const newRoutes = await this.originDestinationRepo.save(routes);

      await this.patchCountryCity(companyId, data.countryCode);

      return newRoutes;
    } catch (err) {
      throw err;
    }
  }

  async update(
    companyId: number,
    userId: number,
    id: number,
    data: UpdateOriginDestinationDto,
  ) {
    try {
      const route = await this.originDestinationRepo.findOne({ id, companyId });
      if (!route) {
        throw new NotFoundException('Origin Destination not found');
      }

      const duplicateRoute = await this.originDestinationRepo.count({
        countryName: route.countryName,
        countryCode: route.countryCode,
        ...data,
        companyId,
        id: Not(id),
      });
      if (duplicateRoute) {
        throw new BadRequestException('Origin Destination already exists');
      }

      const duplicateCityCode = await this.originDestinationRepo.count({
        cityCode: data.cityCode,
        companyId,
        id: Not(id),
      });
      if (duplicateCityCode) {
        throw new BadRequestException('City code already exists');
      }

      const duplicateCityName = await this.originDestinationRepo.count({
        countryName: route.countryName,
        cityName: data.cityName,
        companyId,
        id: Not(id),
      });
      if (duplicateCityName) {
        throw new BadRequestException(
          'Data with the same city name already exists in the same country',
        );
      }

      Object.assign(route, { ...data, updatedBy: userId });
      return await this.originDestinationRepo.save(route);
    } catch (err) {
      throw err;
    }
  }

  async hideOrShow(companyId: number, userId: number, id: number) {
    try {
      const route = await this.originDestinationRepo.findOne({ id, companyId });
      if (!route) {
        throw new NotFoundException('Origin Destination not found');
      }

      if (route.status) {
        route.status = 0;
        route.deletedBy = userId;
        route.deletedAt = new Date();
      } else {
        route.status = 1;
      }

      const saveRoute = await this.originDestinationRepo.save(route);

      await this.patchCountryCity(companyId, route.countryCode);

      return saveRoute;
    } catch (err) {
      throw err;
    }
  }

  async getCountries(user: CurrentUserDto, companyId: number, all = false) {
    const condition: any[] = [{ companyId }];
    if (user.isTrial) {
      condition.push({ company: { affiliation: EAffiliation.DUMMY } });
    }
    if (!all) condition['cityTotal'] = MoreThan(0);
    return await this.countryRepo.find({
      where: condition,
      order: { countryName: 'ASC' },
      relations: ['company']
    })
  }

  async getCitiesByCountry(companyId: number, countryCode: string, user:CurrentUserDto) {
    let query = this.originDestinationRepo
      .createQueryBuilder('routes')
      .innerJoinAndSelect('routes.company', 'c')
      .where(
        `
        routes.countryCode = :countryCode
        AND ${ !user.isTrial ? `routes.companyId = :companyId` : `c.affiliation = :dummyAffiliation`}
        AND routes.status = :status
      `,
        { countryCode, companyId, status: 1, dummyAffiliation : EAffiliation.DUMMY },
      )
      .select([
        'routes.countryName',
        'routes.cityName',
        'routes.countryCode',
        'routes.cityCode',
        'routes.id',
      ])
      .orderBy({ 'routes.cityName': 'ASC' });

    return query.getMany();
  }

  async getCityCode(companyId: number, cityName: string, isTrial = false) {
    if (cityName === 'All Cities') {
      return { cityCode: 'All Cities' };
    }
    if(isTrial){
      return await this.originDestinationRepo
        .createQueryBuilder('r')
        .innerJoin('r.company', 'c')
        .where(
          `
        r.cityName = :cityName
        AND c.affiliation = :dummyAffiliation
        AND r.status = :status
        `,
          { cityName, companyId, status: 1, dummyAffiliation: EAffiliation.DUMMY },
        )
        .select(['r.cityCode'])
        .getOne();
    }else{
      return await this.originDestinationRepo
        .createQueryBuilder('r')
        .where(
          `
        r.cityName = :cityName
        AND r.companyId = :companyId
        AND r.status = :status
        `,
          { cityName, companyId, status: 1 },
        )
        .select(['r.cityCode'])
        .getOne();
    }
  }

  async patchCountryCity(companyId: number, countryCode: string) {
    return await this.connection
      .query(`UPDATE m_countries mc JOIN ( SELECT SUM(IF(m_origin_destination.status = 1, 1, 0)) AS total, m_origin_destination.country_code, m_origin_destination.company_id
          FROM m_origin_destination WHERE m_origin_destination.company_id = ${companyId} AND m_origin_destination.country_code = '${countryCode}'
          GROUP BY m_origin_destination.country_code ) mo ON
          mo.company_id = mc.company_id AND mo.country_code = mc.country_code SET mc.city_total = mo.total;`);
  }

  async getCountryCode(companyId: number, countryName: string) {
    return await this.originDestinationRepo
      .createQueryBuilder('r')
      .where(
        `
        r.countryName = :countryName
        AND r.companyId = :companyId
        AND r.status = :status
        `,
        { countryName, companyId, status: 1 },
      )
      .select(['r.countryCode'])
      .getOne();
  }
}
