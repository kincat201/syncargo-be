import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, getRepository, Not } from 'typeorm';
import { Port } from 'src/entities/port.entity';
import { CreatePortDto } from './dtos/create-port.dto';
import { UpdatePortDto } from './dtos/update-port.dto';
import { CurrentUserDto } from '../auth/dtos/current-user.dto';
import { EAffiliation } from '../../enums/enum';

@Injectable()
export class PortsService {
  constructor(
    @InjectRepository(Port)
    private portRepo: Repository<Port>,
  ) {}

  async getAll(user: CurrentUserDto, payload: any) {
    const query = this.portRepo
            .createQueryBuilder('p')
            .innerJoinAndSelect('p.company', 'c')
            .where(`
                p.countryCode = :countryCode
                AND ${ !user.isTrial ? `p.companyId = :companyId` : `c.affiliation = :dummyAffiliation`}
                AND p.portType = :portType
                AND p.status = :status
            `,{ ...payload, status:1, companyId : user.companyId, dummyAffiliation: EAffiliation.DUMMY})
            .select(['p.id', 'p.portName', 'p.status'])
            .orderBy({ 'p.portName': 'ASC' });
    return await query.getMany();
  }

  async getPaged(
    companyId: number,
    portType: string,
    page: number,
    perpage: number,
    filter: string,
    sort: string,
  ) {
    try {
      const limit = perpage;
      const offset = perpage * (page - 1);

      let query = getRepository(Port)
        .createQueryBuilder('p')
        .innerJoin('p.country', 'c')
        .where(
          `
          p.companyId = :companyId
          AND c.companyId = :companyId
          AND p.portType = :portType`,
          { companyId, portType },
        )
        .select([
          'p.id AS id',
          'c.countryName AS countryName',
          'p.portName AS portName',
          'p.countryCode AS countryCode',
          'p.status AS status',
        ]);

      const totalCount = await query.getCount();
      if (!totalCount) {
        throw new HttpException('No content', HttpStatus.NO_CONTENT);
      }

      if (filter) {
        query = query.andWhere(
          `(p.portName like :filter OR c.countryName like :filter)`,
          {
            filter: `%${filter}%`,
          },
        );
      }

      if (sort && (sort === 'ASC' || sort === 'DESC')) {
        query.orderBy('p.portName', sort);
      } else {
        query.orderBy('p.updatedAt', 'DESC');
      }

      query.groupBy('p.id');

      const allData = await query.getRawMany();
      const totalRecord = allData.length;

      const data = await query.limit(limit).offset(offset).getRawMany();
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

  async create(
    companyId: number,
    userId: number,
    data: CreatePortDto,
    transaction: boolean = false,
  ) {
    try {
      const port = await this.portRepo.findOne({
        where: {
          ...data,
          companyId,
        },
        select: ['id', 'status'],
      });

      if (!port) {
        const newPort = this.portRepo.create({
          createdBy: userId,
          companyId,
          ...data,
        });
        return transaction ? newPort : await this.portRepo.save(newPort);
      }

      if (port && !port.status) {
        return await this.hideOrShow(companyId, userId, port.id);
      }
    } catch (err) {
      throw err;
    }
  }

  async update(
    companyId: number,
    userId: number,
    id: number,
    data: UpdatePortDto,
  ) {
    try {
      const port = await this.portRepo.findOne({ id, companyId });
      if (!port) {
        throw new NotFoundException('Port not found');
      }
      const duplicatePort = await this.portRepo.findOne({
        ...data,
        companyId,
        id: Not(id),
      });
      if (duplicatePort) {
        throw new BadRequestException('Port already exists');
      }

      Object.assign(port, { ...data, updatedBy: userId });
      return await this.portRepo.save(port);
    } catch (err) {
      throw err;
    }
  }

  async hideOrShow(companyId: number, userId: number, id: number) {
    try {
      const port = await this.portRepo.findOne({ id, companyId });
      if (!port) {
        throw new NotFoundException('Port not found');
      }

      if (port.status) {
        port.status = 0;
        port.deletedBy = userId;
        port.deletedAt = new Date();
      } else {
        port.status = 1;
      }

      return await this.portRepo.save(port);
    } catch (err) {
      throw err;
    }
  }
}
