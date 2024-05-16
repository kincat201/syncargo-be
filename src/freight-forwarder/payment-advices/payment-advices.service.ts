import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { Connection, Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { PaymentAdviceDto } from './dtos/payment-advice.dto';
import { PaymentAdvice } from 'src/entities/payment-advice.entity';
import { Bank } from 'src/entities/bank.entity';
import { Currency } from 'src/entities/currency.entity';
export class PaymentAdvicesService {
  constructor(
    @InjectRepository(Bank) private bankRepo: Repository<Bank>,
    @InjectRepository(Currency) private currencyRepo: Repository<Currency>,
    @InjectRepository(PaymentAdvice)
    private adviceRepo: Repository<PaymentAdvice>,
    private connection: Connection,
  ) {}

  async submit(user: User, body: PaymentAdviceDto, id?: number) {
    try {
      const { bankName, currencyName } = body;
      let paymentAdvice;

      if (id) {
        paymentAdvice = await this.adviceRepo.findOne({
          id,
          companyId: user.companyId,
        });
        if (!paymentAdvice) {
          throw new NotFoundException('Payment Advice not found');
        }
      }

      return await this.connection.transaction(async (entityManager) => {
        const bank = await this.bankRepo.findOne({
          where: { name: bankName, companyId: user.companyId, status: 1 },
          select: ['id'],
        });
        if (!bank) {
          const newBank = this.bankRepo.create({
            name: bankName,
            companyId: user.companyId,
            createdByUserId: user.userId,
          });
          await entityManager.save(newBank);
        }

        const currency = await this.currencyRepo.findOne({
          where: { name: currencyName, companyId: user.companyId, status: 1 },
          select: ['id'],
        });
        if (!currency) {
          const newCurrency = this.currencyRepo.create({
            name: currencyName,
            companyId: user.companyId,
            createdByUserId: user.userId,
          });
          await entityManager.save(newCurrency);
        }

        if (id) {
          Object.assign(paymentAdvice, body, { updatedByUserId: user.userId });
          return await entityManager.save(paymentAdvice);
        } else {
          paymentAdvice = this.adviceRepo.create({
            ...body,
            companyId: user.companyId,
            createdByUserId: user.userId,
          });
          return await entityManager.save(paymentAdvice);
        }
      });
    } catch (error) {
      throw error;
    }
  }

  async hideOrShow(id: number, user: User) {
    try {
      const paymentAdvice = await this.adviceRepo.findOne({ id });
      if (!paymentAdvice) {
        throw new NotFoundException('Payment Advice not found');
      }

      if (paymentAdvice.status) {
        paymentAdvice.status = 0;
        paymentAdvice.deletedByUserId = user.userId;
        paymentAdvice.deletedAt = new Date();
      } else {
        paymentAdvice.status = 1;
      }

      return await this.adviceRepo.save(paymentAdvice);
    } catch (err) {
      throw err;
    }
  }
}
