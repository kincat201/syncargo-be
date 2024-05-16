import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  UserHistory,
  UserHistoryDocument,
} from '../../schemas/userHistory.schema';
import { CurrentUserDto } from '../auth/dtos/current-user.dto';

@Injectable()
export class UserHistoriesService {
  constructor(
    @InjectModel(UserHistory.name)
    private userHistoryModel: Model<UserHistoryDocument>,
  ) {}

  async getAllUserHistory(
    page: number,
    perpage: number,
    filter: string,
    sort: string,
    createdAt: string,
    currentUser: CurrentUserDto,
  ) {
    try {
      const limit = perpage;
      const offset = perpage * (page - 1);

      let condition = null;
      let filterDomain = [
        { subdomain: currentUser.subdomain }
      ]

      if(currentUser.customerSubdomain) filterDomain.push({ subdomain: currentUser.customerSubdomain })

      if (currentUser.isTrial) {
        condition = {
          $and: [
            {
              $or: filterDomain,
            },
            { affiliation: 'TRIAL' },
          ],
        };
      } else {
        condition = {
          $and: [
            {
              $or: filterDomain,
            },
          ],
        };
      }

      if (filter) {
        Object.assign(condition, {
          $or: [
            { fullName: { $regex: '.*' + filter + '.*', $options: 'i' } },
            { ip: { $regex: '.*' + filter + '.*', $options: 'i' } },
            { email: { $regex: '.*' + filter + '.*', $options: 'i' } },
            { companyName: { $regex: '.*' + filter + '.*', $options: 'i' } },
          ],
        });
      }

      if (createdAt) {
        if (condition['$or']) {
          condition['$or'].push({
            loginTime: { $regex: '.*' + createdAt + '.*', $options: 'i' },
          });
          condition['$or'].push({
            lastAccessTime: { $regex: '.*' + createdAt + '.*', $options: 'i' },
          });
        } else {
          Object.assign(condition, {
            $or: [
              { loginTime: { $regex: '.*' + createdAt + '.*', $options: 'i' } },
              {
                lastAccessTime: {
                  $regex: '.*' + createdAt + '.*',
                  $options: 'i',
                },
              },
            ],
          });
        }
      }

      const totalRecord = await this.userHistoryModel.countDocuments(condition);
      if (!totalRecord) {
        throw new HttpException('No content', HttpStatus.NO_CONTENT);
      }

      const sortCondition = {};

      if (sort && (sort === 'ASC' || sort === 'DESC')) {
        Object.assign(sortCondition, { createdAt: sort === 'DESC' ? -1 : 1 });
      } else {
        Object.assign(sortCondition, { createdAt: -1 });
      }

      const data = await this.userHistoryModel
        .find(condition)
        .select([
          'fullName',
          'ip',
          'email',
          'loginTime',
          'lastAccessTime',
          'createdAt',
          'platform',
          'role',
          'companyName',
          'companyId',
          'platform',
          'subdomain',
        ])
        .limit(limit)
        .skip(offset)
        .sort(sortCondition);

      const totalShowed = data.length;

      return {
        page,
        totalRecord,
        totalShowed,
        totalPage: Math.ceil(totalRecord / limit),
        showing: `${totalRecord ? offset + 1 : 0} - ${
          offset + totalShowed
        } of ${totalRecord}`,
        next: offset + totalShowed !== totalRecord,
        data,
      };
    } catch (err) {
      throw err;
    }
  }
}
