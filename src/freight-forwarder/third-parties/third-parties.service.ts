import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ThirdParty } from '../../entities/third-party.entity';
import { Repository } from 'typeorm';
import { CurrentUserDto } from '../auth/dtos/current-user.dto';
import { CreateThirdPartyRequest } from './dtos/create-third-party.dto';
import { Company } from '../../entities/company.entity';
import { PaginatedResult } from './dtos/pagination-response.dto';

@Injectable()
export class ThirdPartyService {
  constructor(
    @InjectRepository(ThirdParty)
    private thirdPartyRepo: Repository<ThirdParty>,
    @InjectRepository(Company)
    private companyRepo: Repository<Company>,
  ) {}

  public async createThirdParty(
    user: CurrentUserDto,
    data: CreateThirdPartyRequest,
  ) {
    const thirdParty = await this.constructThirdParty(user, data);
    return this.thirdPartyRepo.save(thirdParty);
  }

  public async updateThirdParty(
    user: CurrentUserDto,
    data: CreateThirdPartyRequest,
    thirdPartyId: number,
  ) {
    const thirdParty: ThirdParty = await this.thirdPartyRepo.findOne({
      where: {
        id: thirdPartyId,
        company: { id: user.companyId },
        status: true,
      },
    });

    if (!thirdParty) {
      throw new BadRequestException('No third party found');
    }

    this.changeThirdPartyData(thirdParty, data);
    await this.thirdPartyRepo.save(thirdParty);
  }

  public async updateThirdPartyStatus(
    user: CurrentUserDto,
    thirdPartyId: number,
    status: boolean,
  ) {
    const thirdParty: ThirdParty = await this.thirdPartyRepo.findOne({
      where: {
        id: thirdPartyId,
        company: { id: user.companyId },
      },
    });

    if (!thirdParty) {
      throw new BadRequestException('No third party found');
    }

    thirdParty.status = status;
    await this.thirdPartyRepo.save(thirdParty);
  }

  public async getPaged(
    page: number,
    perpage: number,
    filter: string,
    sort: string,
    user: CurrentUserDto,
  ): Promise<PaginatedResult<ThirdParty>> {
    const query = this.thirdPartyRepo
      .createQueryBuilder('tp')
      .innerJoinAndSelect('tp.company', 'c')
      .where(
        `
        c.id = :companyId
        AND (tp.pic_name like :filter
        OR tp.company_name like :filter)
      `,
      )
      .setParameters({
        companyId: user.companyId,
        filter: filter ? `%${filter}%` : '%%',
      })
      .select([
        'tp.id',
        'tp.picName',
        'tp.companyName',
        'tp.currency',
        'tp.typeOfPayment',
        'tp.phoneCode',
        'tp.phoneNumber',
        'tp.email',
        'tp.businessLicense',
        'tp.type',
        'tp.createdAt',
        'tp.updatedAt',
        'tp.status',
      ]);

    if (sort === 'DESC') {
      query.orderBy('tp.updatedAt', sort);
    } else {
      query.orderBy('tp.id', 'ASC');
    }

    const totalRecord = await query.getCount();

    const data: ThirdParty[] = await query
      .skip((page - 1) * perpage)
      .take(perpage)
      .getMany();

    const response: PaginatedResult<ThirdParty> = {
      page,
      totalRecord,
      totalShowed: data.length,
      totalPage: Math.ceil(totalRecord / perpage),
      showing: `${totalRecord ? (page - 1) * perpage + 1 : 0} - ${
        (page - 1) * perpage + data.length
      } of ${totalRecord}`,
      next: (page - 1) * perpage + data.length !== totalRecord,
      data,
    };

    return response;
  }

  public async getThirdPartyDetail(
    user: CurrentUserDto,
    thirdPartyId: number,
  ): Promise<ThirdParty> {
    return this.thirdPartyRepo.findOne({
      where: { id: thirdPartyId, company: { id: user.companyId } },
    });
  }

  public async getAll(user: CurrentUserDto): Promise<ThirdParty[]> {
    return this.thirdPartyRepo
      .createQueryBuilder('tp')
      .innerJoinAndSelect('tp.company', 'c')
      .where(
        `
        tp.status = :thirdPartyStatus
        AND c.id = :companyId
      `,
      )
      .setParameters({
        thirdPartyStatus: true,
        companyId: user.companyId,
      })
      .getMany();
  }

  private async constructThirdParty(
    user: CurrentUserDto,
    data: CreateThirdPartyRequest,
  ): Promise<ThirdParty> {
    const company: Company = await this.companyRepo.findOne({
      where: { id: user.companyId },
    });

    return {
      ...data,
      id: undefined,
      createdByUserId: user.userId,
      createdAt: undefined,
      company,
    };
  }

  private changeThirdPartyData(
    thirdParty: ThirdParty,
    data: CreateThirdPartyRequest,
  ): void {
    thirdParty.businessLicense = data.businessLicense
      ? data.businessLicense
      : thirdParty.businessLicense;
    thirdParty.companyName = data.companyName
      ? data.companyName
      : thirdParty.companyName;
    thirdParty.currency = data.currency ? data.currency : thirdParty.currency;
    thirdParty.picName = data.picName ? data.picName : thirdParty.picName;
    thirdParty.typeOfPayment = data.typeOfPayment
      ? data.typeOfPayment
      : thirdParty.typeOfPayment;
    thirdParty.phoneCode = data.phoneCode
      ? data.phoneCode
      : thirdParty.phoneCode;
    thirdParty.phoneNumber = data.phoneNumber
      ? data.phoneNumber
      : thirdParty.phoneNumber;
    thirdParty.email = data.email ? data.email : thirdParty.email;
    thirdParty.type = data.type ? data.type : thirdParty.type;
    thirdParty.address = data.address ? data.address : thirdParty.address;
  }
}
