import {
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, Repository } from 'typeorm';
import { CurrentUserDto } from '../auth/dtos/current-user.dto';
import { User } from '../../entities/user.entity';
import { QuotationRevenueHistory } from '../../entities/quotation-revenue-history.entity';
import { QuotationRevenueHistoryAction, QuotationRevenueHistoryActionLabel, RfqStatus } from '../../enums/enum';

@Injectable()
export class QuotationRevenueHistoryService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(QuotationRevenueHistory) private quotationRevenueHistoryRepo: Repository<QuotationRevenueHistory>,
    private connection: Connection,
  ) {}

  async submit(rfqNumber: string, rfqStatus: RfqStatus, currentUser: CurrentUserDto) {
    return await this.connection.transaction(async (entityManager) => {

      let action = null;

      if([RfqStatus.DRAFT].includes(rfqStatus)){
        action = QuotationRevenueHistoryActionLabel[QuotationRevenueHistoryAction.PROPOSITION];
      }else if([RfqStatus.WAITING,RfqStatus.SUBMITTED].includes(rfqStatus)){
        action = QuotationRevenueHistoryActionLabel[QuotationRevenueHistoryAction.NEGOTIATION];
      }else if([RfqStatus.COMPLETED].includes(rfqStatus)){
        action = QuotationRevenueHistoryActionLabel[QuotationRevenueHistoryAction.WON];
      }else if([RfqStatus.REJECTED,RfqStatus.CANCELLED].includes(rfqStatus)){
        action = QuotationRevenueHistoryActionLabel[QuotationRevenueHistoryAction.LOSS];
      }

      const quotationRevenueHistory = this.quotationRevenueHistoryRepo.create({
        rfqNumber,
        action,
        createdByUserId: currentUser.userId,
        companyId: currentUser.companyId,
      });

      return await entityManager.save(quotationRevenueHistory);
    });
  }
}
