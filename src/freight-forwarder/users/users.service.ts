import { User } from './../../entities/user.entity';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Connection,
  getConnection,
  QueryRunner,
  Repository,
  getRepository,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { format } from 'date-fns';
import { Role } from 'src/enums/enum';

import { Crypto } from 'src/utilities/crypto';
import { Menu } from 'src/entities/menu.entity';

import { Helper } from '../helpers/helper';
import { MailService } from '../../mail/mail.service';
import { RedisService } from 'src/redis/redis.service';
import { S3Service } from 'src/s3/s3.service';
import { AnnouncementsService } from '../announcements/announcements.service';

import { UpdateUserDto } from 'src/freight-forwarder/settings/dtos/update-user.dto';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateOtherUserDto } from './dtos/update-other-user-dto';
import { UserResetPasswordDto } from './dtos/user-reset-password.dto';
import { Company } from 'src/entities/company.entity';
import { UserRegistDto } from './dtos/user-regist.dto';
import { CurrentUserDto } from '../auth/dtos/current-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  UserActivity,
  UserActivityDocument,
} from 'src/schemas/userActivityHistory.schema';
import { UserActivityDto } from './dtos/user-activity.dto';
import { ForgotPasswordActivityDto } from './dtos/forgot-password-activity.dto';
import { EAffiliation } from '../../enums/enum';

@Injectable()
export class UsersService {
  private queryRunner: QueryRunner;

  constructor(
    private crypto: Crypto,
    private connection: Connection,
    private mailService: MailService,
    private redisService: RedisService,
    private readonly s3Service: S3Service,
    private helper: Helper,
    private announcementsService: AnnouncementsService,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Company) private companyRepo: Repository<Company>,
    @InjectRepository(Menu) private menuRepo: Repository<Menu>,
    @InjectModel(UserActivity.name)
    private userActivityModel: Model<UserActivityDocument>,
  ) {
    this.queryRunner = this.connection.createQueryRunner();
  }

  async checkActivationCode(code: string) {
    const company = await this.companyRepo.findOne({
      where: { activationCode: code, status: 1 },
      select: [
        'name',
        'email',
        'picName',
        'isTrial',
        'phoneCode',
        'phoneNumber',
      ],
    });
    if (!company) {
      throw new BadRequestException('Code is invalid');
    }

    return {
      message: 'Code is valid',
      companyName: company.name,
      email: company.email,
      fullName: company.picName,
      phoneCode: company.phoneCode,
      phoneNumber: company.phoneNumber,
      isTrial: company.isTrial,
    };
  }

  async create(body: UserRegistDto) {
    const { companyName, fullName, email, password, phoneCode, phoneNumber } =
      body;

    const picUser = await this.userRepo
      .createQueryBuilder('u')
      .innerJoinAndSelect('u.company', 'c')
      .where(
        `
        c.name = :companyName
        AND c.status = :status
        AND u.email = :email
        AND u.password IS NULL
        AND u.role = :role
        AND u.createdBy = :createdBy
        AND u.status = :status
      `,
      )
      .setParameters({
        companyName,
        email,
        role: Role.ADMIN,
        createdBy: 'SELF',
        status: 1,
      })
      .getOne();

    if (!picUser) {
      throw new BadRequestException();
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    Object.assign(picUser, {
      fullName,
      password: hashedPassword,
      phoneCode,
      phoneNumber,
      userStatus: 'USERVERIFICATION',
    });

    await this.userRepo.save(picUser);

    return body;
  }

  // TODO: refactor
  async getSidebar(userId: number) {
    try {
      const getMenu = await getRepository(Menu)
        .createQueryBuilder('m')
        .where('m.is_menu = true')
        .orderBy('m.position', 'ASC')
        .select([
          'm.id',
          'm.name',
          'm.slug',
          'm.icon',
          'm.position',
          'm.route',
          'm.parentId',
          'm.isMenu',
        ])
        .getMany();

      const userMenu = await getConnection()
        .createQueryBuilder()
        .from('m_access_menu_users', 'menus')
        .where('user_id = :userId', { userId })
        .getRawMany();

      const same = getMenu.filter((o1) =>
        userMenu.some((o2) => o1.id === o2.menu_id),
      );

      let result = [];

      const menus = same.map((e) => {
        e['permission'] = true;
        return e;
      });

      // let menus =  getMenu.map(e => {
      //   e['permission'] = true
      //   return e
      // })

      menus.map((e, i) => {
        if (!e.parentId) {
          result.push({
            id: e.id,
            name: e.slug,
            title: e.name,
            icon: e.icon,
            route: e.route,
            position: e.position,
            child: [],
          });
        }
      });

      result = result.map((e) => {
        menus.map((el) => {
          if (el.parentId === e.id) {
            e.child.push({
              id: el.id,
              name: el.slug,
              title: el.name,
              icon: el.icon,
              route: el.route,
              position: el.position,
              child: [],
            });
          }
        });
        return e;
      });

      result.map((e) => {
        e.child.map((el) => {
          menus.map((el2) => {
            if (el2.parentId === el.id) {
              el.child.push({
                id: el2.id,
                name: el2.slug,
                title: el2.name,
                icon: el2.icon,
                route: el2.route,
                position: el2.position,
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

      return result;
    } catch (error) {
      throw error;
    }
  }

  // TODO: refactor
  async findById(userId: number, companyId: number) {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .innerJoinAndSelect('u.company', 'c')
      .leftJoinAndSelect(
        'c.subscriptionHistories',
        'sh',
        `
        sh.activeDate <= CURDATE()
        AND CURDATE() < sh.expiryDate
      `,
      )
      .leftJoinAndSelect('u.menus', 'm')
      .where(
        `
        u.userId = :userId
        AND u.companyId = :companyId
        AND u.role NOT IN (:...roles)
        AND u.status = :status
        AND c.status = :status
      `,
      )
      .setParameters({
        userId,
        companyId,
        roles: [Role.SUPER_ADMIN, Role.CUSTOMER],
        status: 1,
      })
      .getOne();

    if (!user) {
      throw new NotFoundException();
    }

    const isNewMember = user.lastLogin ? false : true;

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

    const same = menu.filter((o1) => user.menus.some((o2) => o1.id === o2.id));

    let result = [];

    const menus = same.map((e) => {
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
    };

    const permission = {
      userAffiliation: user.affiliation, // nle or cardig
      customerModule: user.company.customerModule,
      companyFeature: features.map((e) => e.name)[0],
      isTrial: user.company.isTrial,
      isTrialExpired: !user.company.subscriptionHistories?.length,
      trialExpiredDate:
        user.company.isTrial && user.company.subscriptionHistories?.length > 0
          ? user.company.subscriptionHistories[0].expiryDate
          : format(new Date(), 'yyyy-MM-dd'),
      userRole: user.role, // admin, manager, or staff
      userMenus: result,
      // user menu access
    };

    const announcement = await this.announcementsService.getOne();

    return {
      profile,
      permission,
      announcement,
    };
  }

  // TODO: refactor
  async getAllUsers(
    page: number,
    perpage: number,
    filter: string,
    sort: string,
    createdAt: string,
    currentUser,
  ) {
    try {
      const limit = perpage;
      const offset = perpage * (page - 1);
      let query = this.userRepo
        .createQueryBuilder('u')
        .innerJoin('u.company', 'c')
        .where(
          `
          u.affiliation = :affiliation
          AND u.role NOT IN (:...roles)
          AND u.status = :status
          AND c.subdomain = :subdomain
          AND c.status = :status
        `,
        )
        .setParameters({
          affiliation: currentUser.affiliation,
          roles: [Role.SUPER_ADMIN, Role.CUSTOMER],
          subdomain: currentUser.subdomain,
          status: 1,
        })
        .select([
          'u.fullName',
          'u.email',
          'u.role',
          'u.userStatus',
          'u.password',
          'u.userId',
          'u.divisionName',
        ]);

      if (filter) {
        query = query.andWhere(
          `
          ((u.fullName like :filter) OR (u.email like :filter) OR (u.role like :filter))`,
          { filter: `%${filter}%` },
        );
      }

      if (createdAt) {
        const from = createdAt.split('to')[0];
        const until = createdAt.split('to')[1];
        query = query.andWhere(
          `(DATE(q.createdAt) >= :from AND DATE(q.createdAt) <= :until)`,
          { from, until },
        );
      }

      if (sort && (sort === 'ASC' || sort === 'DESC')) {
        query.orderBy('u.fullName', sort);
      } else {
        query.orderBy('u.updatedAt', 'DESC');
      }

      const allData = await query.getMany();
      const totalRecord = allData.length;
      const data = await query.limit(limit).offset(offset).getMany();

      data.map((e) => {
        e.userStatus =
          e.userStatus === 'OPEN' && !e.password
            ? 'Pending'
            : e.userStatus === 'USERVERIFICATION' && e.password
            ? 'Active'
            : 'NonActive';
        e['isActive'] = e.userStatus === 'Pending' || e.userStatus === 'Active';
        delete e.password;
      });

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
    } catch (error) {
      throw error;
    }
  }

  // TODO: refactor
  async getMenu(user: CurrentUserDto, status = false) {
    try {
      const query = await getConnection()
        .createQueryBuilder()
        .from('c_companies', 'c')
        .leftJoin('c.menus', 'menus')
        .where('c.id = :companyId', { companyId: user.companyId })
        .select(['menus'])
        .getRawMany();

      let result = [];
      query.forEach((e, i) => {
        if (!e.menus_parent_id) {
          result.push({
            id: e.menus_id,
            menu_name: e.menus_name,
            position: e.menus_position,
            permission: status,
            children: [],
          });
        }
      });
      result = result.map((e) => {
        query.map((el) => {
          if (el.menus_parent_id === e.id) {
            e.children.push({
              id: el.menus_id,
              menu_name: el.menus_name,
              position: el.menus_position,
              permission: status,
              children: [],
            });
          }
        });
        return e;
      });

      result.map((e, i) => {
        e.children.map((el) => {
          query.map((el2) => {
            if (el2.menus_parent_id === el.id) {
              el.children.push({
                id: el2.menus_id,
                menu_name: el2.menus_name,
                position: el2.menus_position,
                permission: status,
                children: [],
              });
            }
          });
        });
        e.children.sort(function (a, b) {
          return -(b.position - a.position);
        });
        return e;
      });

      result = result.filter(function (el) {
        if (el.menu_name.toLowerCase() === 'place order') {
          el.menu_name = 'Create Shipment';
        }
        return el.menu_name.toLowerCase() !== 'settings';
      });

      result.sort(function (a, b) {
        return -(b.position - a.position);
      });

      return result;
    } catch (error) {
      throw error;
    }
  }

  async resetPasswordMail(email: string, subdomain: string) {
    try {
      const user = await this.userRepo
        .createQueryBuilder('u')
        .innerJoin('u.company', 'ff')
        .select([
          'u.userStatus',
          'u.fullName',
          'ff.name',
          'ff.logo',
          'ff.address',
          'ff.email',
          'ff.phoneCode',
          'ff.phoneNumber',
          'u.divisionName',
          'u.role',
          'ff.isTrial',
        ])
        .where(
          `
          u.email = :email
          AND u.role IN (:...role)
          AND u.status = :status
          AND ff.subdomain = :subdomain
          AND ff.status = :status
        `,
        )
        .setParameters({
          email,
          role: [Role.ADMIN, Role.MANAGER, Role.STAFF],
          subdomain,
          status: 1,
        })
        .getOne();

      if (!user) {
        return { message: `Reset password link will be sent to ${email}` };
      }

      if (user.userStatus === 'OPEN') {
        if (user.password) {
          throw new UnauthorizedException(
            'Your account is being suspended. Please contact your Admin.',
          );
        }
        throw new UnauthorizedException('Please verify your email address');
      }

      const data = {
        email,
        fullName: user.fullName,
        divisionName: user.divisionName,
        role: user.role,
        isTrial: user.company.isTrial,
        expiredDate: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      };

      const encryptedData = this.crypto.encrypt(data);

      await this.redisService.set(encryptedData, encryptedData, 3600);

      const forEmail = {
        email,
        fullName: user.fullName,
        code: encryptedData,
        url: '',
        endpoint: '',
        ffName: user.company.name,
        ffLogo: user.company.logo,
        ffEmail: user.company.email,
        ffAddress: user.company.address,
        ffPhoneCode: user.company.phoneCode,
        ffPhoneNumber: user.company.phoneNumber,
        subdomain,
      };

      forEmail.url = `https://${subdomain}.syncargo.com`;
      forEmail.endpoint = 'update-password';

      await this.mailService.sendUserConfirmation(forEmail, 'forgot-password');

      return { message: `Reset password link will be sent to ${email}` };
    } catch (error) {
      throw error;
    }
  }

  async checkResetPasswordCode(code: string) {
    try {
      const cache = await this.redisService.get(code);

      if (!cache) {
        throw new BadRequestException(
          'Your request to reset your password has expired. Please try again.',
        );
      }

      const decryptedData = this.crypto.decrypt(code);
      const data = JSON.parse(decryptedData);
      const { email, fullName, divisionName, role, isTrial } = data;

      return {
        message: 'Code is valid',
        email,
        fullName,
        divisionName,
        role,
        isTrial,
      };
    } catch (error) {
      throw error;
    }
  }

  async resetPassword(body: UserResetPasswordDto) {
    try {
      const { code, phoneCode, phoneNumber, password, subdomain } = body;
      const cache = await this.redisService.get(code);
      if (!cache) {
        throw new BadRequestException(
          'Your request to reset your password has expired. Please try again.',
        );
      }

      const decryptedData = this.crypto.decrypt(code);
      const data = JSON.parse(decryptedData);
      const { email } = data;

      const user = await this.userRepo
        .createQueryBuilder('u')
        .innerJoin('u.company', 'c')
        .where(
          `
          u.email = :email
          AND u.role IN (:...role)
          AND u.status = :status
          AND c.subdomain = :subdomain
          AND c.status = :status
        `,
        )
        .setParameters({
          email,
          role: [Role.ADMIN, Role.MANAGER, Role.STAFF],
          subdomain,
          status: 1,
        })
        .getOne();

      if (!user) {
        throw new BadRequestException(
          'Your request to reset your password has expired. Please try again.',
        );
      }

      if (user.userStatus === 'OPEN') {
        user.userStatus = 'USERVERIFICATION';
      }

      const hashedPassword = bcrypt.hashSync(password, 10);
      user.password = hashedPassword;
      user.updatedByUserId = user.userId;

      if (!user.phoneCode && !user.phoneNumber) {
        user.phoneCode = phoneCode;
        user.phoneNumber = phoneNumber;
      }

      await this.userRepo.save(user);

      await this.redisService.del(code);
      await this.redisService.deleteSessions(user.affiliation, user.userId);

      return { message: 'Successfully set password' };
    } catch (error) {
      throw error;
    }
  }

  async updatePassword(userId: number, password: string) {
    const user = await this.userRepo.findOne({ userId });
    if (!user) {
      throw new NotFoundException();
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    user.password = hashedPassword;
    user.updatedByUserId = userId;

    await this.userRepo.save(user);
    await this.redisService.deleteSessions(user.affiliation, userId);

    return { message: 'Successfully change password' };
  }

  async update(currentUser: User, type: string, body: UpdateUserDto) {
    const user = await this.userRepo.findOne({ userId: currentUser.userId });
    if (!user) {
      throw new NotFoundException();
    }

    const { fullName, phoneCode, phoneNumber } = body;

    if (type === 'fullName' && fullName) {
      user.fullName = fullName;
    } else if (type === 'phone' && phoneCode && phoneNumber) {
      const isPhoneExist = await this.userRepo
        .createQueryBuilder('u')
        .where(
          'u.phoneCode = :phoneCode AND u.phoneNumber = :phoneNumber AND NOT u.userId = :userId',
        )
        .setParameters({ phoneCode, phoneNumber, userId: user.userId })
        .getCount();
      if (isPhoneExist) {
        throw new BadRequestException('This phone number is already used');
      }
      user.phoneCode = phoneCode;
      user.phoneNumber = phoneNumber;
    } else {
      throw new BadRequestException('Only allow update name and phone number');
    }

    user.updatedByUserId = currentUser.userId;
    await this.userRepo.save(user);

    return body;
  }

  async updatePhoto(userId: number, data: any) {
    try {
      const user = await this.userRepo.findOne({ userId });
      if (!user) {
        throw new NotFoundException();
      }

      const url = await this.s3Service.uploadPhoto(data);
      if (user.photo) {
        await this.s3Service.deleteFiles([user.photo.split('/').pop()]);
      }

      user.photo = url;
      user.updatedByUserId = userId;

      await this.userRepo.save(user);

      return { message: 'Sucessfully change photo' };
    } catch (error) {
      throw error;
    }
  }

  async getUserProfile(userId: number) {
    const user = await this.userRepo.findOne({ userId });
    return {
      fullName: user.fullName,
      phoneCode: user.phoneCode,
      phoneNumber: user.phoneNumber,
      email: user.email,
      role: user.role,
      fileContainer: user.fileContainer,
      photo: user.photo,
    };
  }

  async createUserFromSettings(
    currentUser: CurrentUserDto,
    body: CreateUserDto,
  ) {
    try {
      const { fullName, email, jobTitle, role, menuAccess } = body;

      return await this.connection.transaction(async (entityManager) => {
        const isEmailExist = await this.userRepo
          .createQueryBuilder('u')
          .where(
            `
            u.email = :email
            AND u.companyId = :companyId
            AND u.role IN (:...role)
          `,
          )
          .setParameters({
            email,
            companyId: currentUser.companyId,
            role: [Role.ADMIN, Role.MANAGER, Role.STAFF],
          })
          .getCount();

        if (isEmailExist) {
          throw new BadRequestException('Email is already used');
        }

        const user = this.userRepo.create({
          fullName,
          email,
          divisionName: jobTitle,
          role,
          companyId: currentUser.companyId,
          affiliation: currentUser.affiliation,
          createdBy: 'ADMIN',
          createdByUserId: currentUser.userId,
        });

        let menus: Menu[];

        if (role === Role.ADMIN) {
          const companyMenus = await this.getMenu(currentUser, true);
          const menuIds = this.helper.getPermittedMenus(companyMenus);
          const menuValues = await this.menuRepo.findByIds(menuIds);
          const adminMenus = await this.menuRepo
            .createQueryBuilder('m')
            .where(
              `
        m.name IN (:...names)
        OR m.parentId = :parentId
        `,
            )
            .setParameters({
              names: ['Settings'],
              parentId: 7, // setings parent id, refer to table m_menus
            })
            .select('m.id')
            .getMany();

          menus = [...menuValues, ...adminMenus];
        } else {
          const menuIds = this.helper.getPermittedMenus(menuAccess);
          const menuValues = await this.menuRepo.findByIds(menuIds);

          const absoluteMenus = await this.menuRepo
            .createQueryBuilder('m')
            .where(`m.name IN (:...names)`, {
              names: ['Settings', 'My Profile'],
            })
            .getMany();

          menus = [...menuValues, ...absoluteMenus];
        }

        user.menus = menus;
        await entityManager.save(user);

        const data = {
          email,
          fullName,
          divisionName: jobTitle,
          role,
          expiredDate: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
        };
        const encryptedData = this.crypto.encrypt(data);

        await this.redisService.set(encryptedData, encryptedData, 604800);

        const company = await this.companyRepo.findOne({
          where: { id: currentUser.companyId },
        });

        const forEmail = {
          email,
          code: encryptedData,
          fullName,
          url: '',
          endpoint: '',
          ffName: company.name,
          ffLogo: company.logo,
          ffEmail: company.email,
          ffAddress: company.address,
          ffPhoneCode: company.phoneCode,
          ffPhoneNumber: company.phoneNumber,
          subdomain: currentUser.subdomain,
        };

        forEmail.url = `https://${currentUser.subdomain}.syncargo.com`;
        forEmail.endpoint = 'create-password';

        await this.mailService.sendUserConfirmation(forEmail, 'new-password');

        return { code: encryptedData };
      });
    } catch (error) {
      throw error;
    }
  }

  // TODO: refactor
  async updateOtherUser(user: UpdateOtherUserDto, currentUser: CurrentUserDto) {
    const checkUser = await this.userRepo.findOne(user.userId, {
      where: {
        companyId: currentUser.companyId,
      },
    });

    if (!checkUser) {
      throw new NotFoundException();
    }

    const tmp = [];
    const createMenuAccess = [];
    if (user.menuAccess && user.menuAccess.length > 0) {
      const findAccess = user.menuAccess.map((e) => {
        if (e.permission) {
          tmp.push(e);
        }
        return e;
      });
    }

    if (user.role.toLowerCase() === 'admin') {
      const companyMenus = await this.getMenu(currentUser, true);
      const menuIds = this.helper.getPermittedMenus(companyMenus);
      const adminMenus = await this.menuRepo
        .createQueryBuilder('m')
        .where(
          `
        m.name IN (:...names)
        OR m.parentId = :parentId
        `,
        )
        .setParameters({
          names: ['Settings'],
          parentId: 7, // setings parent id, refer to table m_menus
        })
        .select('m.id')
        .getMany();

      const getAllMenu = [...menuIds, ...adminMenus.map((menu) => menu.id)];

      getAllMenu.map((e) => {
        createMenuAccess.push({ menu_id: e, user_id: user.userId });
      });
    } else {
      const getSettings = await getConnection()
        .createQueryBuilder()
        .from('m_menus', 'm')
        .where('name = "settings" OR name = "my profile"')
        .getRawMany();

      getSettings.map((e) => {
        createMenuAccess.push({ menu_id: e.id, user_id: user.userId });
      });
    }
    tmp.map((e) => {
      createMenuAccess.push({
        menu_id: e.id,
        user_id: user.userId,
      });
      e.children.map((el) => {
        if (el.permission) {
          createMenuAccess.push({
            menu_id: el.id,
            user_id: user.userId,
          });
        }
        el.children.map((el2) => {
          if (el2.permission) {
            createMenuAccess.push({
              menu_id: el.id,
              user_id: user.userId,
            });
          }
        });
      });
    });

    try {
      return await this.connection.transaction(async (entityManager) => {
        const findMenu = await entityManager
          .createQueryBuilder()
          .from('m_access_menu_users', 'menu')
          .where('user_id = :userId', { userId: user.userId })
          .getRawMany();

        if (findMenu.length > 0) {
          await entityManager
            .createQueryBuilder()
            .delete()
            .from('m_access_menu_users')
            .where('user_id = :userId', { userId: user.userId })
            .execute();
        }

        const checkUser = await this.userRepo.findOne({
          where: { userId: user.userId },
          select: ['userId', 'password'],
        });

        const updateUser = await entityManager
          .createQueryBuilder()
          .update(User)
          .set({
            fullName: user.fullName,
            divisionName: user.jobTitle,
            role: user.role.toLowerCase(),
            phoneCode: user.phoneCode.length === 0 ? null : user.phoneCode,
            phoneNumber:
              user.phoneNumber.length === 0 ? null : user.phoneNumber,
            userStatus:
              user.isActive && checkUser?.password
                ? 'USERVERIFICATION'
                : 'OPEN',
            updatedByUserId: currentUser.userId,
          })
          .where('userId = :userId', { userId: user.userId })
          .execute();

        await entityManager
          .createQueryBuilder()
          .insert()
          .into('m_access_menu_users')
          .values(createMenuAccess)
          .execute();

        return Object.assign(updateUser, { user });
      });
    } catch (error) {
      throw error;
    }
  }

  // TODO: refactor
  async getUserDetail(userId: number) {
    try {
      const query = await this.userRepo
        .createQueryBuilder('u')
        .where('u.userId = :userId', { userId })
        .leftJoin('u.menus', 'menus')
        .select([
          'u.fullName',
          'u.email',
          'u.role',
          'u.divisionName',
          'u.companyId',
          'u.userStatus',
          'u.phoneCode',
          'u.phoneNumber',
          'u.password',
          'menus',
        ])
        .getOne();

      query.userStatus =
        query.userStatus === 'OPEN' && !query.password
          ? 'Pending'
          : query.userStatus === 'USERVERIFICATION' && query.password
          ? 'Active'
          : 'NonActive';
      query['isActive'] =
        query.userStatus === 'Pending'
          ? true
          : query.userStatus === 'Active'
          ? true
          : false;
      query['jobTitle'] = query.divisionName;

      delete query.divisionName;
      delete query.password;

      const menu = await getConnection()
        .createQueryBuilder()
        .from('c_companies', 'c')
        .leftJoin('c.menus', 'menus')
        .where('c.id = :companyId', { companyId: query.companyId })
        .select(['menus'])
        .getRawMany();

      const same = menu.filter((o1) =>
        query.menus.some((o2) => o1.menus_id === o2.id),
      );
      const different = menu.filter(function (obj) {
        return !query.menus.some(function (obj2) {
          return obj.menus_id == obj2.id;
        });
      });

      same.map((e) => {
        e['permission'] = true;
        e.children = [];
      });
      different.map((e) => {
        e['permission'] = false;
        e.children = [];
      });
      let result = [];

      const menus = same.concat(different);

      menus.map((e) => {
        if (!e.menus_parent_id) {
          result.push({
            id: e.menus_id,
            menu_name: e.menus_name,
            position: e.menus_position,
            permission: e.permission,
            children: [],
          });
        }
      });

      result = result.map((e) => {
        menus.map((el) => {
          if (el.menus_parent_id === e.id) {
            e.children.push({
              id: el.menus_id,
              menu_name: el.menus_name,
              position: el.menus_position,
              permission: el.permission,
              children: [],
            });
          }
        });
        return e;
      });

      result.sort(function (a, b) {
        return -(b.id - a.id);
      });

      result = result.filter(function (el) {
        if (el.menu_name.toLowerCase() === 'place order') {
          el.menu_name = 'Create Shipment';
        }
        return el.menu_name.toLowerCase() !== 'settings';
      });

      query.menus = result;

      return query;
    } catch (error) {
      throw error;
    }
  }

  async getUsers(payload: object, select: (keyof User)[]) {
    return await this.userRepo.find({
      where: payload,
      select,
    });
  }

  async getCompanyUsers(
    companyId: number,
    select: (keyof User)[],
  ): Promise<User[]> {
    try {
      const users = await this.userRepo.find({
        where: { companyId },
        select,
      });

      if (!users) {
        throw new NotFoundException('User for this company not found');
      }

      return users;
    } catch (err) {
      throw err;
    }
  }

  async addUserActivity(
    ip: string,
    user: CurrentUserDto,
    data: UserActivityDto,
    token: string,
  ) {
    const userActivity = new this.userActivityModel({
      ip,
      platform: 'FF',
      subdomain: user.subdomain,
      companyId: user.companyId,
      companyName: user.companyName,
      customerId: null,
      fullName: user.fullName,
      email: user.email,
      token: token,
      activity: {
        ...data,
      },
      createdAt: format(new Date(), 'Pp').split(',').join(' at'),
    });
    return await userActivity.save();
  }

  async addForgotPasswordActivity(ip: string, data: ForgotPasswordActivityDto) {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .innerJoinAndSelect('u.company', 'c')
      .where(
        `
        u.email = :email
        AND u.role NOT IN (:...roles)
        AND u.status = :status
        AND c.status = :status
      `,
      )
      .setParameters({
        email: data.email,
        roles: [Role.SUPER_ADMIN, Role.CUSTOMER],
        status: 1,
      })
      .getOne();

    const userActivity = new this.userActivityModel({
      ip,
      platform: 'FF',
      subdomain: user?.company.subdomain || 'User Not Found',
      companyId: user?.companyId || null,
      companyName: user?.company.name || 'User Not Found',
      customerId: user?.customerId || null,
      fullName: user?.fullName || 'User Not Found',
      email: data.email,
      token: null,
      activity: {
        menu: 'Login',
        action: 'Forgot Password',
      },
      createdAt: format(new Date(), 'Pp').split(',').join(' at'),
    });
    const saved = await userActivity.save();

    if (!user) {
      throw new NotFoundException('User not found for email: ' + data.email);
    }
    return saved;
  }

  async getSuperAdminEmail(): Promise<any[]> {
    try {
      const users = await this.userRepo.find({
        where: {
          role: Role.SUPER_ADMIN,
        },
        select: ['email'],
      });

      if (!users) {
        throw new NotFoundException('Users not found');
      }

      return users.map((el) => {
        return el.email;
      });
    } catch (err) {
      throw err;
    }
  }

  async updateApprovedHbl(companyId: number, uploadedFile) {
    try {
      let result: string;
      const company = await this.companyRepo.findOne({
        where: { id: companyId },
      });

      if (company.hblApprovedTemplate) {
        result = company.hblApprovedTemplate;
      } else {
        const uploadedFileUrl = await this.s3Service.uploadBlTemplate(
          uploadedFile,
        );
        const update = await this.companyRepo.save({
          ...company,
          hblApprovedTemplate: uploadedFileUrl,
        });

        result = update.hblApprovedTemplate;
      }

      return result;
    } catch (err) {
      throw err;
    }
  }

  async removeApprovedHbl(companyId: number) {
    try {
      const company = await this.companyRepo.findOne({ id: companyId });

      if (!company) {
        throw new NotFoundException('Company Not Found!');
      }

      const updated = await this.companyRepo.save({
        ...company,
        hblApprovedTemplate: '',
      });

      return updated;
    } catch (err) {
      return err;
    }
  }

  public async initiateThirdPartyMenuOnUsers() {
    const thirdPartyMenu = await this.menuRepo.findOne({
      where: { slug: 'third-party' },
    });

    // get user id that doesn't have third party menu
    const users = await this.userRepo
      .createQueryBuilder('u')
      .select(['u.userId'])
      .where(
        `EXISTS (
          SELECT * FROM m_access_menu_users amu
          JOIN m_menus m ON amu.menu_id = m.id
          WHERE u.id = amu.user_id
          AND EXISTS (
            SELECT * from m_access_menu_users amu
		        JOIN m_menus m on amu.menu_id = m.id
		        WHERE u.id = amu.user_id
		        AND m.slug = 'master-data'
            AND NOT EXISTS(
		        	SELECT * from m_access_menu_users amu
		        	JOIN m_menus m on amu.menu_id = m.id
		        	WHERE u.id = amu.user_id
		        	AND m.slug = 'third-party'
		        )
          )
        )`,
      )
      .getMany();

    const userIds = [];
    const menuId = thirdPartyMenu.id;
    const valueObject = [];
    users.forEach((user) => userIds.push(user.userId));
    userIds.forEach((userId) => {
      valueObject.push({
        user_id: userId,
        menu_id: menuId,
      });
    });

    await this.connection.manager
      .createQueryBuilder()
      .insert()
      .into('m_access_menu_users')
      .values(valueObject)
      .execute();
  }

  public async initiateThirdPartyMenuOnCompanies() {
    const thirdPartyMenu = await this.menuRepo.findOne({
      where: { slug: 'third-party' },
    });

    // get user id that doesn't have third party menu
    const companies = await this.companyRepo
      .createQueryBuilder('c')
      .select(['c.id'])
      .where(
        `EXISTS (
          SELECT * FROM m_access_menu_companies amc
          JOIN m_menus m ON amc.menu_id = m.id
          WHERE c.id = amc.company_id
          AND EXISTS (
            SELECT * from m_access_menu_companies amc
		        JOIN m_menus m on amc.menu_id = m.id
		        WHERE c.id = amc.company_id
		        AND m.slug = 'master-data'
            AND NOT EXISTS(
		        	SELECT * from m_access_menu_companies amc
		        	JOIN m_menus m on amc.menu_id = m.id
		        	WHERE c.id = amc.company_id
		        	AND m.slug = 'third-party'
		        )
          )
        )`,
      )
      .getMany();

    const companyIds = [];
    const menuId = thirdPartyMenu.id;
    const valueObject = [];
    companies.forEach((company) => companyIds.push(company.id));
    companyIds.forEach((companyId) => {
      valueObject.push({
        company_id: companyId,
        menu_id: menuId,
      });
    });

    await this.connection.manager
      .createQueryBuilder()
      .insert()
      .into('m_access_menu_companies')
      .values(valueObject)
      .execute();
  }

  public async getOneUserEntityById(userId: number, companyId: number) {
    return await this.userRepo.findOne({
      where: {
        userId,
        companyId,
      }
    });
  }
}
