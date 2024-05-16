import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, Equal, Not, Repository } from 'typeorm';
import { format } from 'date-fns';

import { User } from 'src/entities/user.entity';
import { Customer } from 'src/entities/customer.entity';

import { CreateCustomerDto } from './dtos/create-customer.dto';
import { UpdateCustomerDto } from './dtos/update-customer.dto';
import { Role } from 'src/enums/enum';
import { CurrentUserDto } from '../auth/dtos/current-user.dto';

import { MailService } from 'src/mail/mail.service';

import { Crypto } from 'src/utilities/crypto';
import { CustomerNle } from '../../entities/customer-nle.entity';
import { Company } from '../../entities/company.entity';
import { EAffiliation } from '../../enums/enum';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    @InjectRepository(CustomerNle)
    private customerNleRepo: Repository<CustomerNle>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Company) private companyRepo: Repository<Company>,
    private crypto: Crypto,
    private mailService: MailService,
    private connection: Connection,
  ) {}
  async getAll(currentUser: CurrentUserDto) {
    try {
      let query = null;
      if (currentUser.isTrial) {
        query = this.customerRepo
          .createQueryBuilder('c')
          .innerJoin('c.user', 'u')
          .where(`
            (( c.companyId = :companyId
            AND c.userAffiliation = :userAffiliation )
            OR (c.affiliation = :dummyAffiliation))
            AND c.status = :status
            AND u.status = :status
          `)
          .setParameters({
            companyId: currentUser.companyId,
            userAffiliation: currentUser.affiliation,
            status: 1,
            dummyAffiliation: EAffiliation.DUMMY,
          })
          .select([
            'c.id',
            'c.customerId',
            'c.fullName',
            'c.createdAt',
            'c.companyName',
            'c.typeOfPayment',
            'u.customerLogin',
          ]);
      } else {
        query = this.customerRepo
          .createQueryBuilder('c')
          .leftJoin('c.customerNle','cn')
          .innerJoin('c.user', 'u')
          .where(`
            (( c.companyId = :companyId
            AND c.userAffiliation = :userAffiliation )
            OR ( cn.companyId = :companyId AND c.userAffiliation = 'NLE'))
            AND c.status = :status
            AND u.status = :status
          `)
          .setParameters({
            companyId: currentUser.companyId,
            userAffiliation: currentUser.affiliation,
            status: 1,
          })
          .select([
            'c.id',
            'c.customerId',
            'c.fullName',
            'c.createdAt',
            'c.companyName',
            'c.typeOfPayment',
            'u.customerLogin',
        ]);
      }


      return await query.getMany();
    } catch (err) {
      throw new err();
    }
  }

  async getPaged(
    page: number,
    perpage: number,
    filter: string,
    sort: string,
    createdAt: string,
    currentUser: CurrentUserDto,
    isNle = false,
  ) {
    try {
      const limit = perpage;
      const offset = perpage * (page - 1);
      let query = null;

      if (currentUser.isTrial) {
        query = this.customerRepo.createQueryBuilder('c')
          .innerJoin('c.user', 'u', `
          (u.companyId = :companyId
          AND u.role = :role
          AND u.status = :status)
          OR
          (c.affiliation = :dummyUserAffiliation
          AND u.role = :role
          AND u.status = :status)
        `)
          .select([
            'c.id',
            'c.customerId',
            'c.fullName',
            'c.createdAt',
            'c.companyName',
            'c.status',
            'u.customerLogin',
            'c.userAffiliation',
          ])
          .where(`
          (c.userAffiliation = :userAffiliation
          AND c.companyId = :companyId)
          OR
          (c.userAffiliation = :dummyUserAffiliation
          AND u.role = :role
          AND u.status = :status)
        `)
          .setParameters({
            userAffiliation: currentUser.affiliation,
            companyId: currentUser.companyId,
            role: Role.CUSTOMER,
            status: 1,
            dummyUserAffiliation: EAffiliation.DUMMY,
          });
      }
      else if(!isNle){
        query = this.customerRepo.createQueryBuilder('c')
          .innerJoin('c.user', 'u', `
          u.companyId = :companyId
          AND u.role = :role
          AND u.status = :status
        `,
          )
          .select([
            'c.id',
            'c.customerId',
            'c.fullName',
            'c.createdAt',
            'c.companyName',
            'c.status',
            'u.customerLogin',
          ])
          .where(`
          c.userAffiliation = :userAffiliation
          AND c.companyId = :companyId
        `)
        .setParameters({
          userAffiliation: currentUser.affiliation,
          companyId: currentUser.companyId,
          role: Role.CUSTOMER,
          status: 1,
        });
      }else{
        query = this.customerNleRepo.createQueryBuilder('cn')
          .innerJoin('cn.customer', 'c')
          .innerJoin('c.user', 'u', `u.role = :role AND u.status = :status`)
          .select([
            'cn.id',
            'cn.customerId',
            'cn.status',
            'cn.createdAt',
            'c.fullName',
            'c.companyName',
            'u.customerLogin',
          ])
          .where(
            ` c.userAffiliation = :userAffiliation AND cn.companyId = :companyId `,
          )
          .setParameters({
            userAffiliation: 'NLE',
            role: Role.CUSTOMER,
            companyId: currentUser.companyId,
            status: 1,
          });
      }

      if (filter) {
        query = query.andWhere(
          `(c.fullName like :filter OR
              c.customerId like :filter OR
              c.companyName like :filter)`,
          { filter: `%${filter}%` },
        );
      }

      if (createdAt) {
        const from = createdAt.split('to')[0];
        const until = createdAt.split('to')[1];
        if(isNle){
          query = query.andWhere(
            `(DATE(cn.createdAt) >= :from AND
              DATE(cn.createdAt) <= :until)`,
            { from, until },
          );
        }else{
          query = query.andWhere(
            `(DATE(c.createdAt) >= :from AND
              DATE(c.createdAt) <= :until)`,
            { from, until },
          );
        }
      }

      if (sort && (sort === 'ASC' || sort === 'DESC')) {
        query.orderBy('c.fullName', sort);
      } else {
        query.orderBy('c.updatedAt', 'DESC');
      }

      const totalRecord = await query.getCount();

      if (!totalRecord) {
        throw new HttpException('No content', HttpStatus.NO_CONTENT);
      }

      const data = await query.limit(limit).offset(offset).getMany();
      const totalShowed = data.length;

      let result = [];

      if (isNle) {
        data.map((item) => {
          result.push({
            id: item.id,
            customerId: item.customerId,
            status: item.status,
            createdAt: item.createdAt,
            fullName: item.customer?.fullName,
            companyName: item.customer?.companyName,
            user: {
              customerLogin: item.customer?.user?.customerLogin,
            },
          });
        });
      } else {
        result = data;
      }

      return {
        page,
        totalRecord,
        totalShowed,
        totalPage: Math.ceil(totalRecord / limit),
        showing: `${totalRecord ? offset + 1 : 0} - ${
          offset + totalShowed
        } of ${totalRecord}`,
        next: offset + totalShowed !== totalRecord,
        data: result,
      };
    } catch (err) {
      throw err;
    }
  }

  async getDetail(id: number, currentUser: CurrentUserDto) {
    try {
      const whereStatement = [
        {
          id,
          userAffiliation: currentUser.affiliation,
          companyId: currentUser.companyId,
        }
      ];

      if (currentUser.isTrial) {
        whereStatement.push({
          id,
          userAffiliation: EAffiliation.DUMMY,
          companyId: currentUser.companyId,
        });
      }

      const customer = await this.customerRepo.findOne({
        select: [
          'id',
          'customerId',
          'fullName',
          'companyName',
          'address',
          'npwp',
          'phoneCode',
          'phoneNumber',
          'customerType',
          'email',
          'createdAt',
          'typeOfPayment',
        ],
        where: whereStatement,
      });

      if (!customer) {
        throw new NotFoundException('Customer not found');
      }
      return customer;
    } catch (err) {
      throw err;
    }
  }

  async create(body: CreateCustomerDto, currentUser: CurrentUserDto) {
    try {
      const {
        fullName,
        companyName,
        email,
        phoneCode,
        phoneNumber,
        customerType,
        npwp,
        address,
        typeOfPayment,
      } = body;

      const regex = /[^A-Za-z\u00C0-\u024F\u1E00-\u1EFF\-\’\.\'\s]/;
      if (fullName.search(regex) !== -1) {
        throw new BadRequestException('Name contains invalid character');
      }

      const duplicateEmail = await this.customerRepo.count({
        email,
        userAffiliation: currentUser.affiliation,
        companyId: currentUser.companyId,
      });

      if (duplicateEmail) {
        throw new BadRequestException('Email is already used');
      }

      let duplicateCompany = await this.customerRepo.count({
        companyName,
        userAffiliation: currentUser.affiliation,
        companyId: currentUser.companyId,
      });

      if (duplicateCompany) {
        throw new BadRequestException('Company already exists');
      }

      let duplicatePhone = await this.customerRepo.count({
        phoneCode,
        phoneNumber,
        userAffiliation: currentUser.affiliation,
        companyId: currentUser.companyId,
      });

      if (duplicatePhone) {
        throw new BadRequestException('Phone number is already used');
      }

      let duplicateNpwp = await this.customerRepo.count({
        npwp,
        userAffiliation: currentUser.affiliation,
        companyId: currentUser.companyId,
      });

      if (duplicateNpwp) {
        throw new BadRequestException('NPWP is already used');
      }

      const previousCustomer = await this.customerRepo.findOne({
        where: {
          userAffiliation: currentUser.affiliation,
          companyId: currentUser.companyId,
        },
        select: ['customerId'],
        order: { id: 'DESC' },
      });

      const previousNumber = previousCustomer
        ? +previousCustomer.customerId.split('-')[0]
        : 0;
      const nextNumber = `${previousNumber + 1}`.padStart(4, '0');

      let randomNumber = '';
      for (let i = 0; i < 7; i++) {
        randomNumber += Math.floor(Math.random() * 10).toString();
      }

      const customerId = `${nextNumber}-${randomNumber}`;

      const data = {
        email,
        createdAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      };
      const encryptedData = this.crypto.encrypt(data);

      const customer = this.customerRepo.create({
        customerId,
        createdByUserId: currentUser.userId,
        userAffiliation: currentUser.affiliation,
        companyId: currentUser.companyId,
        fullName,
        companyName,
        email,
        phoneCode,
        phoneNumber,
        customerType,
        npwp,
        address,
        typeOfPayment,
        activationCode: encryptedData,
      });

      const user = this.userRepo.create({
        fullName,
        email,
        role: Role.CUSTOMER,
        affiliation: currentUser.affiliation,
        companyId: currentUser.companyId,
        createdBy: 'FF',
        createdByUserId: currentUser.userId,
        customerId,
        customerLogin: false,
        customerSubdomain: currentUser.customerSubdomain,
      });

      if (!currentUser.customerModule) {
        user.userStatus = 'USERVERIFICATION';
      }

      const company = await this.companyRepo.findOne({
        where: { id: currentUser.companyId,},
      })

      const mailBody = {
        email,
        fullName,
        url: '',
        endpoint: '',
        code: encryptedData,
        ffName: company.name,
        ffLogo: company.logo,
        ffEmail: company.email,
        ffAddress: company.address,
        ffPhoneCode: company.phoneCode,
        ffPhoneNumber: company.phoneNumber,
        customerSubdomain: currentUser.customerSubdomain,
      }

      mailBody.url = process.env.NODE_ENV === 'production' ?
        `https://${currentUser.customerSubdomain}.customer.syncargo.com` :
        `https://${currentUser.customerSubdomain}.syncargo.com`
      mailBody.endpoint = 'activation-customer';

      return await this.connection.transaction(async (entityManager) => {
        await entityManager.save(user);
        await this.mailService.customerVerifyAccount(mailBody)

        const company = await entityManager.findOne(Company, {
          where: { id: currentUser.companyId }
        });

        if (company.trialLimit?.addCustomer) {
          company.trialLimit.addCustomer -= 1;
        }
        await entityManager.save(company);
        return await entityManager.save(customer);
      });
    } catch (err) {
      throw err;
    }
  }

  async update(
    id: number,
    data: UpdateCustomerDto,
    currentUser: CurrentUserDto,
  ) {
    try {
      const regex = /[^A-Za-z\u00C0-\u024F\u1E00-\u1EFF\-\’\.\'\s]/;

      if (data.fullName.search(regex) !== -1) {
        throw new BadRequestException('Name contains invalid character');
      }

      const customer = await this.customerRepo.findOne({
        id,
        userAffiliation: currentUser.affiliation,
        companyId: currentUser.companyId,
      });
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }

      if (data.email) {
        const duplicateEmail = await this.customerRepo.findOne({
          where: {
            email: data.email,
            id: Not(Equal(id)),
            userAffiliation: currentUser.affiliation,
            companyId: currentUser.companyId,
          },
          select: ['id'],
        });

        if (duplicateEmail) {
          throw new BadRequestException('Email is already used');
        }
      }

      if (data.companyName) {
        const duplicateCompany = await this.customerRepo.findOne({
          where: {
            companyName: data.companyName,
            id: Not(Equal(id)),
            userAffiliation: currentUser.affiliation,
            companyId: currentUser.companyId,
          },
          select: ['id'],
        });

        if (duplicateCompany) {
          throw new BadRequestException('Company already exists');
        }
      }

      let duplicatePhone = await this.customerRepo.findOne({
        where: {
          id: Not(Equal(id)),
          phoneCode: data.phoneCode,
          phoneNumber: data.phoneNumber,
          userAffiliation: currentUser.affiliation,
          companyId: currentUser.companyId,
        },
        select: ['id'],
      });

      if (duplicatePhone) {
        throw new BadRequestException('Phone number is already used');
      }

      let duplicateNpwp = await this.customerRepo.findOne({
        where: {
          id: Not(Equal(id)),
          npwp: data.npwp,
          userAffiliation: currentUser.affiliation,
          companyId: currentUser.companyId,
        },
        select: ['id'],
      });

      if (duplicateNpwp) {
        throw new BadRequestException('NPWP is already used');
      }

      Object.assign(customer, { ...data, updatedByUserId: currentUser.userId });

      const user = await this.userRepo.findOne({
        role: Role.CUSTOMER,
        affiliation: currentUser.affiliation,
        companyId: currentUser.companyId,
        customerId: customer.customerId,
      });

      Object.assign(user, { fullName: data.fullName, email: data.email });

      return await this.connection.transaction(async (entityManager) => {
        await entityManager.save(user);
        return await entityManager.save(customer);
      });
    } catch (err) {
      throw err;
    }
  }

  async hideOrShow(id: number, currentUser: CurrentUserDto, isNle = false) {
    try {
      if (isNle) {
        const customer = await this.customerNleRepo.findOne({ id });
        if (!customer) {
          throw new NotFoundException('Customer not found');
        }

        if (customer.status) {
          customer.status = 0;
        } else {
          customer.status = 1;
        }

        return await this.customerNleRepo.save(customer);
      } else {
        const customer = await this.customerRepo.findOne({ id });
        if (!customer) {
          throw new NotFoundException('Customer not found');
        }

        if (customer.status) {
          customer.status = 0;
          customer.deletedByUserId = currentUser.userId;
          customer.deletedAt = new Date();
        } else {
          customer.status = 1;
        }

        return await this.customerRepo.save(customer);
      }
    } catch (err) {
      throw err;
    }
  }

  async inActivate(customerId: string, currentUser: CurrentUserDto) {
    try {
      const user = await this.userRepo
        .createQueryBuilder('u')
        .innerJoin('u.customer', 'c')
        .where(`u.customerId = :customerId AND u.role = :role`, {
          customerId,
          role: Role.CUSTOMER,
        })
        .select(['u', 'c.activationCode'])
        .getOne();

      if (!user) {
        throw new NotFoundException('Customer not found');
      }

      return await this.connection.transaction(async (entityManager) => {
        if (user.customerLogin) {
          user.customerLogin = false;
          await entityManager.save(user);

          return { message: 'Successfully inactivate customer' };
        }

        user.customerLogin = true;
        await entityManager.save(user);

        if (!user.password) {
          const company = await this.companyRepo.findOne({
            where: { id: currentUser.companyId,},
          })

          const mailBody = {
            email: user.email,
            fullName: user.fullName,
            code: user.customer.activationCode,
            url: '',
            endpoint: '',
            ffName: company.name,
            ffLogo: company.logo,
            ffEmail: company.email,
            ffAddress: company.address,
            ffPhoneCode: company.phoneCode,
            ffPhoneNumber: company.phoneNumber,
            customerSubdomain: currentUser.customerSubdomain,
          }

          mailBody.url = process.env.NODE_ENV === 'production' ?
            `https://${currentUser.customerSubdomain}.customer.syncargo.com` :
            `https://${currentUser.customerSubdomain}.syncargo.com`
          mailBody.endpoint = 'activation-customer';
          await this.mailService.customerVerifyAccount(mailBody)
        }

        return { message: 'Successfully activate customer' };
      });
    } catch (err) {
      throw err;
    }
  }
}
