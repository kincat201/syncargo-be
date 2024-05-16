import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  Notification,
  NotificationDocument,
} from 'src/schemas/notification.schema';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { Repository } from 'typeorm';
import { CurrentUserDto } from '../auth/dtos/current-user.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  async create(notif: object | object[]) {
    try {
      return this.notificationModel.create(notif);
    } catch (error) {
      return error;
    }
  }

  async countTotalUnread(companyId: number, userId: number) {
    const totalUnreadNotification = await this.notificationModel.countDocuments(
      {
        'receipient.platform': 'FF',
        'receipient.companyId': companyId,
        'receipient.users': { $elemMatch: { userId, isRead: false } },
      },
    );

    return { totalUnreadNotification };
  }

  // to get latest and get paged
  async getPaged(
    companyId: number,
    userId: number,
    type: string,
    page: number,
    perpage: number,
    isRead: string,
  ) {
    try {
      const limit = perpage;
      const offset = perpage * (page - 1);

      const condition = {
        'receipient.platform': 'FF',
        'receipient.companyId': companyId,
        'receipient.users': { $elemMatch: { userId } },
      };

      if (
        ['Quotation', 'Shipment', 'Invoice', 'Bill of Lading','Jobsheet'].includes(type)
      ) {
        Object.assign(condition, { type });
      }

      const project = {
        customerId: '$customerId',
        customerLogo: '$customerLogo',
        type: '$type',
        actionStatus: '$actionStatus',
        rfqNumber: '$rfqNumber',
        countryFromCode: '$countryFromCode',
        countryFrom: '$countryFrom',
        countryToCode: '$countryToCode',
        countryTo: '$countryTo',
        invoiceNumber: '$invoiceNumber',
        invoiceStatus: '$invoiceStatus',
        jobSheetNumber: '$jobSheetNumber',
        isRead: {
          $filter: {
            input: '$receipient.users',
            as: 'user',
            cond: {
              $eq: ['$$user.userId', userId],
            },
          },
        },
        createdAt: '$createdAt',
      };

      if (isRead === 'true' || isRead === 'false') {
        const bool = isRead === 'true' ? true : false;
        Object.assign(project, {
          isRead: {
            $filter: {
              input: '$receipient.users',
              as: 'user',
              cond: {
                $and: [
                  { $eq: ['$$user.userId', userId] },
                  { $eq: ['$$user.isRead', bool] },
                ],
              },
            },
          },
        });
      }

      const data = await this.notificationModel.aggregate([
        { $match: condition },
        { $project: project },
        { $unwind: '$isRead' },
        { $set: { isRead: '$isRead.isRead' } },
        { $sort: { createdAt: -1 } },
        { $skip: offset },
        { $limit: limit },
      ]);

      const count = await this.notificationModel
        .aggregate([
          { $match: condition },
          { $project: { isRead: project['isRead'] } },
          { $unwind: '$isRead' },
          { $set: { isRead: '$isRead.isRead' } },
        ])
        .count('count');

      const totalRecord = count[0].count;
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
        isAllRead: !data.some((el) => !el.isRead), // TODO: do the loop inside query
        data,
      };
    } catch (error) {
      return error;
    }
  }

  async unReadOne(companyId: number, userId: number, id: string) {
    try {
      const condition = {
        _id: id,
        'receipient.platform': 'FF',
        'receipient.companyId': companyId,
        'receipient.users': { $elemMatch: { userId } },
      };
      const notif = await this.notificationModel
        .findOne(condition, ['receipient.users'])
        .exec();

      if (!notif) {
        throw new BadRequestException('Notification not found');
      }

      const user = notif.receipient['users'].find((el) => el.userId === userId); // TODO: do the loop inside query

      return await this.notificationModel
        .updateOne(condition, {
          $set: { 'receipient.users.$.isRead': user.isRead ? false : true },
        })
        .exec();
    } catch (error) {
      return error;
    }
  }

  async readMany(
    companyId: number,
    userId: number,
    type: string,
    page: number,
    perpage: number,
    isRead: string,
  ) {
    try {
      const limit = perpage;
      const offset = perpage * (page - 1);

      const condition = {
        'receipient.platform': 'FF',
        'receipient.companyId': companyId,
        'receipient.users': { $elemMatch: { userId } },
      };

      if (['Quotation', 'Shipment', 'Invoice','Jobsheet'].includes(type)) {
        Object.assign(condition, { type });
      }

      const project = {
        customerId: '$customerId',
        customerLogo: '$customerLogo',
        type: '$type',
        actionStatus: '$actionStatus',
        rfqNumber: '$rfqNumber',
        countryFromCode: '$countryFromCode',
        countryFrom: '$countryFrom',
        countryToCode: '$countryToCode',
        countryTo: '$countryTo',
        invoiceNumber: '$invoiceNumber',
        invoiceStatus: '$invoiceStatus',
        jobSheetNumber: '$jobSheetNumber',
        isRead: {
          $filter: {
            input: '$receipient.users',
            as: 'user',
            cond: {
              $eq: ['$$user.userId', userId],
            },
          },
        },
        createdAt: '$createdAt',
      };

      if (isRead === 'true' || isRead === 'false') {
        const bool = isRead === 'true' ? true : false;
        Object.assign(project, {
          isRead: {
            $filter: {
              input: '$receipient.users',
              as: 'user',
              cond: {
                $and: [
                  { $eq: ['$$user.userId', userId] },
                  { $eq: ['$$user.isRead', bool] },
                ],
              },
            },
          },
        });
      }

      const notifs = await this.notificationModel.aggregate([
        { $match: condition },
        { $project: project },
        { $unwind: '$isRead' },
        { $set: { isRead: '$isRead.isRead' } },
        { $sort: { createdAt: -1 } },
        { $skip: offset },
        { $limit: limit },
      ]);

      const objectIds = [];
      notifs.forEach((el) => objectIds.push(el._id));

      Object.assign(condition, { _id: { $in: objectIds } });

      return await this.notificationModel.updateMany(condition, {
        $set: { 'receipient.users.$.isRead': true },
      });
    } catch (error) {
      return error;
    }
  }

  async notifyInternalApproval(
    user: CurrentUserDto,
    type: any,
    actionStatus: string,
    additionalAttribute: any,
    staff = false,
    staffIds = [],
  ){
    const { userId, companyId } = user;

    const receipientQuery = this.userRepository
      .createQueryBuilder('c')
      .select('c.id', 'userId')
      .where('c.user_status = :status', { status: 'USERVERIFICATION' })
      .andWhere('c.company_id = :comp_id', { comp_id: companyId });

    if (staff) {
      receipientQuery.andWhere('c.id IN (:staffIds)', { staffIds });
    } else {
      receipientQuery.andWhere('c.role IN (:...role)', {
        role: ['manager', 'admin'],
      });
    }

    const receipient = {
      platform: 'FF',
      companyId: companyId,
      users: [],
    };

    const receipientResult = await receipientQuery.getRawMany();

    receipientResult.forEach((e) => {
      e['isRead'] = false;
      receipient['users'].push(e);
    });

    const payload = {
      customerLogo: user.companyLogo,
      createdBy: userId,
      createdAt: new Date(),
      type,
      actionStatus,
      receipient,
    }

    if (additionalAttribute) Object.assign(payload, additionalAttribute);

    return this.create(payload);
  }
}
