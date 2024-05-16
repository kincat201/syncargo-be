import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';

import { getConnection, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { format } from 'date-fns';

import { RedisService } from '../../redis/redis.service';
import { AnnouncementsService } from '../announcements/announcements.service';

import { User } from 'src/entities/user.entity';
import {
  UserHistory,
  UserHistoryDocument,
} from 'src/schemas/userHistory.schema';

import { CeisaAccessTokenExpired, Features, Role } from 'src/enums/enum';
import { CurrentUserDto } from './dtos/current-user.dto';
import { EAffiliation } from '../../enums/enum';
import { NleUserInfoDto } from '../nle/dtos/nle-user-info.dto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private redisService: RedisService,
    private configService: ConfigService,
    private announcementsService: AnnouncementsService,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectModel(UserHistory.name)
    private userHistoryModel: Model<UserHistoryDocument>,
  ) {}

  async login(subdomain: string, email: string, password: string, ip: string) {
    try {
      const user = await this.userRepo
        .createQueryBuilder('u')
        .innerJoinAndSelect('u.company', 'c')
        .leftJoinAndSelect('u.menus', 'm')
        .leftJoinAndSelect(
          'c.subscriptionHistories',
          'sh',
          `
          sh.activeDate <= CURDATE()
          AND CURDATE() < sh.expiryDate 
        `,
        )
        .where(
          `
          u.email = :email 
          AND u.role NOT IN (:...roles) 
          AND u.status = :status 
          AND c.subdomain = :subdomain
          AND c.status = :status
        `,
        )
        .setParameters({
          email,
          roles: [Role.SUPER_ADMIN, Role.CUSTOMER],
          subdomain,
          status: 1,
        })
        .addSelect(['sh.id'])
        .orderBy('sh.activeDate', 'ASC')
        .getOne();

      if (!user) {
        throw new UnauthorizedException('Email and/or password is incorrect');
      }

      if (
        !user.company.subscriptionHistories?.length &&
        !user.company.isTrial
      ) {
        throw new UnauthorizedException('Subscription expired');
      }

      if (user.userStatus === 'OPEN') {
        if (user.password) {
          throw new UnauthorizedException(
            'Your account is being suspended. Please contact your Admin.',
          );
        }
        throw new UnauthorizedException('Please verify your email address');
      }

      const isEqual = bcrypt.compareSync(password, user.password);
      if (!isEqual) {
        throw new UnauthorizedException('Email and/or password is incorrect');
      }

      const isNewMember = user.lastLogin ? false : true;

      const loggedAt = new Date();
      user.lastLogin = loggedAt;
      this.userRepo.save(user);

      await this.userHistoryModel.create({
        ip: ip,
        platform: 'FF',
        role: user.role,
        subdomain,
        companyId: user.companyId,
        companyName: user.company.name,
        affiliation: user.company.affiliation,
        customerId: null,
        fullName: user.fullName,
        email: user.email,
        loginTime: format(loggedAt, 'Pp').split(',').join(' at'),
        lastAccessTime: null,
        createdAt: format(loggedAt, 'Pp').split(',').join(' at'),
      });

      const menu = await getConnection()
        .createQueryBuilder()
        .from('m_menus', 'menu')
        .where('is_menu = 1')
        .getRawMany();

      const features = await getConnection()
        .createQueryBuilder()
        .select('features.name AS name')
        .from('m_features', 'features')
        .where('features.id IN (:...ids)', { ids: user.company.features })
        .getRawMany();

      let same = menu.filter((o1) => user.menus.some((o2) => o1.id === o2.id));

      let result = [];

      let menus = same.map((e) => {
        e['permission'] = true;
        return e;
      });

      menus.map((e) => {
        if (!e.parent_id) {
          result.push({
            id: e.id,
            name: e.slug,
            title: e.name,
            icon: e.icon,
            route: e.route,
            position: e.position,
            permission: e.permission,
            child: [],
          });
        }
      });

      result = result.map((e) => {
        menus.map((el) => {
          if (el.parent_id === e.id) {
            if(el.parent_id == 2){
              if(user.company.features.includes(Features.ALL_FEATURES) || user.company.features.includes(Features.CRM)){
                e.child.push({
                  id: el.id,
                  name: el.slug,
                  title: el.name,
                  icon: el.icon,
                  route: el.route,
                  position: el.position,
                  permission: el.permission,
                  child: [],
                });
              }
            }else{
              e.child.push({
                id: el.id,
                name: el.slug,
                title: el.name,
                icon: el.icon,
                route: el.route,
                position: el.position,
                permission: el.permission,
                child: [],
              });
            }
          }
        });
        return e;
      });

      result.map((e) => {
        e.child.map((el) => {
          menus.map((el2) => {
            if (el2.parent_id === el.id) {
              el.child.push({
                id: el2.id,
                name: el2.slug,
                title: el2.name,
                icon: el2.icon,
                route: el2.route,
                position: el2.position,
                permission: el2.permission,
                child: [],
              });
            }
            delete el2.id;
          });
          delete el.id;
        });
        e.child.sort(function (a, b) {
          return -(b.position - a.position);
        });
        delete e.id;
        return e;
      });

      result.sort(function (a, b) {
        return -(b.position - a.position);
      });

      const profile = {
        // person data
        userId: user.userId,
        userFullName: user.fullName,
        userEmail: user.email,
        userPhoneCode: user.phoneCode,
        userPhoneNumber: user.phoneNumber,
        userDivision: user.divisionName,
        userStatus: user.userStatus,
        isNewMember,

        // company data
        companyId: user.companyId,
        companyName: user.company.name,
        companyAddress: user.company.address,
        companyEmail: user.company.email,
        companyPhoneCode: user.company.phoneCode,
        companyPhoneNumber: user.company.phoneNumber,
        companyThemeColor: user.company.themeColor,
        companyShipmentQuotaUnlimited: user.company.shipmentQuotaUnlimited,
      };

      const permission = {
        userAffiliation: user.affiliation, // nle or cardig or trial
        customerModule: user.company.customerModule,
        companyFeature: features.map((e) => e.name)[0],
        isTrial: user.company.isTrial,
        isTrialExpired:
          user.company.isTrial && !user.company.subscriptionHistories?.length,
        trialExpiredDate:
          user.company.isTrial && user.company.subscriptionHistories?.length > 0
            ? user.company.subscriptionHistories[0].expiryDate
            : format(new Date(), 'yyyy-MM-dd'),
        userRole: user.role, // admin, manager, or staff
        userMenus: result, // user menu access
      };

      const announcement = await this.announcementsService.getOne();

      const dataToken = {
        companyId: user.companyId,
        companyFeatureIds: user.company.features,
        companyName: user.company.name,
        companyLogo: user.company.logo,
        subdomain: user.company.subdomain,
        customerModule: user.company.customerModule,
        customerSubdomain: user.company.customerSubdomain,
        companyShipmentQuotaUnlimited: user.company.shipmentQuotaUnlimited,
        userId: user.userId,
        fullName: user.fullName,
        email: user.email,
        phoneCode: user.phoneCode,
        phoneNumber: user.phoneNumber,
        affiliation: user.affiliation,
        role: user.role,
        userStatus: user.userStatus,
        status: user.status,
        isTrial: user.company.isTrial,
        isTrialExpired: !user.company.subscriptionHistories?.length,
      };
      const token = this.jwtService.sign(dataToken);
      await this.redisService.set(
        `session-${user.affiliation}:${user.userId}-${token}`,
        token,
        this.configService.get('CACHE_TTL'),
      );

      return {
        session: { loggedAt, token },
        profile,
        permission,
        announcement,
      };
    } catch (error) {
      throw error;
    }
  }

  async logout(user: CurrentUserDto, ip: string) {
    const { affiliation, userId, fullName, email, companyName, subdomain } =
      user;

    const loggedAt = new Date();

    await this.userHistoryModel.create({
      ip: ip,
      platform: 'FF',
      role: user.role,
      subdomain,
      companyId: user.companyId,
      companyName,
      affiliation,
      customerId: null,
      fullName,
      email,
      loginTime: null,
      lastAccessTime: format(loggedAt, 'Pp').split(',').join(' at'),
      createdAt: format(loggedAt, 'Pp').split(',').join(' at'),
    });

    await this.redisService.deleteSessions(affiliation, userId);

    return { message: 'Logged out' };
  }

  async loginNle(
    accessToken: string,
    body: NleUserInfoDto,
    user: CurrentUserDto,
  ) {
    try {
      this.redisService.set(
        'CEISA_ACCESS_TOKEN_' + user.userId,
        accessToken,
        CeisaAccessTokenExpired,
      );

      return {
        name: body.name,
        email: body.email,
        identitas: body.identitas,
      };
    } catch (error) {
      throw error;
    }
  }
}
