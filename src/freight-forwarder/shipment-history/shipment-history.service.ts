import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Shipment } from 'src/entities/shipment.entity';
import { User } from 'src/entities/user.entity';
import { Connection, Repository } from 'typeorm';
import { SubmitShipmentHistory } from './dtos/submit-shipment-history';
import { ShipmentHistory } from '../../entities/shipment-history.entity';
import { Quotation } from '../../entities/quotation.entity';
import { CurrentUserDto } from '../auth/dtos/current-user.dto';
import { ShipmentLabel } from '../../enums/enum';

@Injectable()
export class ShipmentHistoryService {
  constructor(
    @InjectRepository(ShipmentHistory)
    private shipmentHistoryRepo: Repository<ShipmentHistory>,
    @InjectRepository(Shipment) private shipmentRepo: Repository<Shipment>,
    @InjectRepository(Quotation) private quotationRepo: Repository<Quotation>,
    private connection: Connection,
  ) {}

  async submit(userId: number, rfqNumber: string, body: SubmitShipmentHistory) {
    const quotation = await this.quotationRepo.findOne({
      rfqNumber,
      status: 1,
    });
    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    return await this.connection.transaction(async (entityManager) => {
      const shipmentHistory = this.shipmentHistoryRepo.create({
        rfqNumber,
        createdByUserId: userId,
        ...body,
      });

      return await entityManager.save(shipmentHistory);
    });
  }

  async getPaged(
    page: number,
    perpage: number,
    rfqNumber: string,
    currentUser: CurrentUserDto,
  ) {
    const limit = perpage;
    const offset = perpage * (page - 1);

    const query = await this.shipmentHistoryRepo
      .createQueryBuilder('sh')
      .innerJoin('sh.creator', 'cr')
      .select([
        'sh.id',
        'sh.createdAt',
        'sh.createdByUserId',
        'cr.fullName',
        'sh.description',
        'sh.details',
      ])
      .where(
        ` sh.rfqNumber = :rfqNumber
        AND sh.status = :status`,
        {
          status: 1,
          rfqNumber,
        },
      )
      .orderBy('sh.createdAt', 'DESC');

    const allData = await query.getMany();
    const totalRecord = allData.length;

    const data = await query.limit(limit).offset(offset).getMany();
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
  }

  async requestRemoveFile(
    user: CurrentUserDto,
    rfqNumber: string,
    body: SubmitShipmentHistory,
    shipmentLabel: ShipmentLabel,
    entityManager: any,
  ) {
    const shipment = await entityManager
      .createQueryBuilder(Shipment, 's')
      .innerJoinAndSelect('s.quotation', 'q')
      .where(`
        s.rfqNumber = :rfqNumber
        AND s.status = :status
        AND q.companyId = :companyId
        AND q.status = :status
      `)
      .setParameters({
        rfqNumber,
        status: 1,
        companyId: user.companyId,
      })
      .getOne();

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    shipment.label = shipmentLabel;

    const shipmentHistory = entityManager.create(ShipmentHistory, {
      rfqNumber,
      createdByUserId: user.userId,
      ...body,
    });

    await entityManager.save(shipmentHistory);

    await entityManager.save(shipment);
  }
}
