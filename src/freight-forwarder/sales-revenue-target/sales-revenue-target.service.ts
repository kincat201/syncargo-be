import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, Repository } from 'typeorm';
import { CurrentUserDto } from '../auth/dtos/current-user.dto';
import { User } from '../../entities/user.entity';
import { SalesRevenueTargetHistory } from '../../entities/sales-revenue-target-history.entity';
import { SubmitSalesRevenueTarget } from './dtos/submit-sales-revenue-target';
import { Helper } from '../helpers/helper';
import { endOfMonth, startOfMonth } from 'date-fns';

@Injectable()
export class SalesRevenueTargetService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(SalesRevenueTargetHistory) private salesRevenueTargetHistoryRepo: Repository<SalesRevenueTargetHistory>,
    private connection: Connection,
    private helper: Helper,
  ) {}

  async submit(salesId: number, body: SubmitSalesRevenueTarget, currentUser: CurrentUserDto) {
    const sales = await this.userRepo.findOne({
      companyId: currentUser.companyId,
      userId: salesId,
      status: 1,
    });
    if (!sales) {
      throw new NotFoundException('Sales not found');
    }

    return await this.connection.transaction(async (entityManager) => {

      const salesRevenueTargetHistory = this.salesRevenueTargetHistoryRepo.create({
        userId:salesId,
        createdByUserId: currentUser.userId,
        companyId: currentUser.companyId,
        action: sales.fullName + '\'s revenue target was changed to IDR '+ this.helper.setThousand(body.revenueTarget),
        ...body,
      });

      sales.revenueTarget = body.revenueTarget;
      await entityManager.save(sales);

      return await entityManager.save(salesRevenueTargetHistory);
    });
  }

  async getRevenueTargetHistory(salesId: number, date: string, currentUser: CurrentUserDto) {

    const from = startOfMonth(new Date(date));
    const until = endOfMonth(new Date(date));

    const salesRevenueTargetHistories = await this.salesRevenueTargetHistoryRepo
      .createQueryBuilder('sh')
      .select([
        'sh.userId as userId',
        'sh.action as action',
        'DATE_FORMAT(sh.period, "%b %Y") as period',
        'sh.createdAt as createdAt'
      ]).where(`
         sh.status = :status 
         AND sh.companyId = :companyId
         AND DATE(sh.period) >= :from AND DATE(sh.period) <= :until
         ${ salesId ? `AND sh.userId = :salesId ` : ``}
      `,{
        status:1,
        companyId: currentUser.companyId,
        salesId,
        from,
        until,
      })
      .orderBy('sh.period','DESC')
      .getRawMany();

    return salesRevenueTargetHistories;
  }
}
