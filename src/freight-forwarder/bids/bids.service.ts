import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, Repository } from 'typeorm';
import { CreateBidDto } from './dtos/create-bid.dto';
import { BidPrice } from 'src/entities/bid-price.entity';
import { Bid } from 'src/entities/bid.entity';
import { User } from 'src/entities/user.entity';
import { Quotation } from 'src/entities/quotation.entity';
import {
  NotificationActionStatus,
  NotificationType,
  RfqStatus,
  Features,
} from 'src/enums/enum';
import { CurrentUserDto } from '../auth/dtos/current-user.dto';
import { MailService } from 'src/mail/mail.service';
import { QuotationsService } from '../quotations/quotations.service';
import { PdfService } from 'src/pdf/pdf.service';
import { OriginDestinationService } from '../origin-destination/origin-destination.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ChatRoomTypes, ChatSenderTypes } from '../../enums/chat';
import { ChatRoom } from '../../entities/chat-room.entity';
import { ChatCustomer } from '../../entities/chat-customer.entity';
import { Model } from 'mongoose';
import { Chat, ChatDocument } from '../../schemas/chat.schema';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class BidsService {
  constructor(
    @InjectRepository(Bid) private bidRepo: Repository<Bid>,
    @InjectRepository(BidPrice) private bidPriceRepo: Repository<BidPrice>,
    @InjectRepository(Quotation) private quotationRepo: Repository<Quotation>,
    @InjectRepository(ChatRoom) private chatRoomRepo: Repository<ChatRoom>,
    @InjectRepository(ChatCustomer)
    private chatCustomerRepo: Repository<ChatCustomer>,
    @InjectModel(Chat.name) private chatModel: Model<ChatDocument>,
    private originDestinationService: OriginDestinationService,
    private quotationsService: QuotationsService,
    private pdfService: PdfService,
    private mailService: MailService,
    private connection: Connection,
    private notificationsService: NotificationsService,
  ) {}

  async getDetail(rfqNumber: string, currentUser: User) {
    const quotation = await this.quotationRepo
      .createQueryBuilder('q')
      .leftJoin('q.quotationNleCompany', 'qnc')
      .innerJoin('q.customer', 'c')
      .where(
        `
        q.rfqNumber = :rfqNumber
        AND (
          (q.affiliation = :affiliation AND qnc.companyId = :companyId AND qnc.status = :status)
          OR (q.affiliation != :affiliation AND (c.companyId = :companyId OR c.affiliation = :affiliation))
        )
      `,
      )
      .setParameters({
        status: 1,
        rfqNumber,
        companyId: currentUser.companyId,
        affiliation: 'NLE',
      })
      .getCount();

    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    const bid = await this.bidRepo
      .createQueryBuilder('b')
      .innerJoinAndSelect('b.quotation', 'q', 'q.rfqNumber = :rfqNumber', {
        rfqNumber,
      })
      .leftJoinAndSelect('b.bidprices', 'bp', 'bp.status = :status', {
        status: 1,
      })
      .select([
        'q',
        'b.shippingLine',
        'b.vendorName',
        'b.minDelivery',
        'b.maxDelivery',
        'b.note',
        'b.currency',
        'bp.price',
        'bp.uom',
        'bp.note',
        'bp.profit',
        'bp.total',
        'bp.priceCompName',
      ])
      .orderBy('bp.id', 'ASC')
      .getOne();

    if (!bid) return bid;
    return {
      rfqId: bid?.quotation?.id ?? '',
      shipmentVia: bid?.quotation?.shipmentVia ?? '',
      validUntil: bid?.quotation?.validUntil ?? '',
      shipmentType: bid?.quotation?.shipmentType ?? '',
      countryFrom: bid?.quotation?.countryFrom ?? '',
      countryFromCode: bid?.quotation?.countryFromCode ?? '',
      countryFromId: bid?.quotation?.countryFromId ?? '',
      cityFrom: bid?.quotation?.countryFrom ?? '',
      countryTo: bid?.quotation?.countryTo ?? '',
      countryToCode: bid?.quotation?.countryToCode ?? '',
      countryToId: bid?.quotation?.countryToId ?? '',
      cityTo: bid?.quotation?.cityTo ?? '',
      shippingLine: bid.shippingLine,
      vendorName: bid.vendorName,
      minDelivery: bid.minDelivery,
      maxDelivery: bid.maxDelivery,
      note: bid.note,
      currency: bid.currency,
      bidprices: bid.bidprices,
    };
  }

  // Step 2 (save as draft and save & next) and
  // place quotation bid (waiting) & edit quotation bid (submitted)
  async create( user: CurrentUserDto, body: CreateBidDto, isUpdate = false) {
    
    const {
      rfqId,
      validUntil,
      shippingLine,
      vendorName,
      minDelivery,
      maxDelivery,
      note,
      currency,
      bidPrices,
      showSubtotal
    } = body;

    if (user.companyFeatureIds.includes(Features.ALL_FEATURES) && (!validUntil || !shippingLine || !vendorName || !minDelivery || !maxDelivery)){
      throw new NotFoundException('body parameter is not valid');
    }
    
    let quotation: Quotation;

    const query = this.quotationRepo
      .createQueryBuilder('q')
      .leftJoin('q.quotationNleCompany', 'qnc')
      .innerJoin('q.customer', 'c')
      .innerJoin('c.company', 'ff')
      .leftJoin('c.user', 'u', 'u.userStatus = :userStatus', { userStatus: 'USERVERIFICATION' })
      .where(`
        q.id = :rfqId
        AND q.status = :status
        AND (
          (q.affiliation = :affiliation AND qnc.companyId = :companyId AND qnc.status = :status)
          OR (q.affiliation != :affiliation AND ${ !user.isTrial ? `(c.companyId = :companyId OR c.affiliation = :affiliation)` : `(c.companyId = :companyId OR q.createdByCompanyId = :companyId OR q.affiliation = :dummyAffiliation)`})
        )
      `,
      )
      .setParameters({
        rfqId,
        companyId: user.companyId,
        status: 1,
        affiliation: 'NLE',
        dummyAffiliation: 'DUMMY',
      });

    let customerEmail: string;
    let isCustomerLoginable: boolean;

    let isSubmitted = false;
    const notificationBody = {};

    if (isUpdate) {
      // place and edit quotation bid
      
      if (user.companyFeatureIds.includes(Features.ALL_FEATURES)){ // assume user feature single number
        quotation = await query
        .addSelect(['c.email', 'u.customerLogin'])
        .andWhere(`q.rfqStatus IN (:...rfqStatus)`, {
          rfqStatus: [RfqStatus.WAITING, RfqStatus.SUBMITTED],
        })
        .getOne();
      }else{
        quotation = await query
        .addSelect(['c.email', 'u.customerLogin'])
        .andWhere(`q.rfqStatus IN (:...rfqStatus)`, {
          rfqStatus: [RfqStatus.WAITING, RfqStatus.SUBMITTED, RfqStatus.COMPLETED],
        })
        .getOne();
      }
      

      if (!quotation) {
        throw new NotFoundException('Quotation not found');
      }

      // place quotation bid
      if (quotation.rfqStatus === RfqStatus.WAITING) {
        const expiredAt =
          quotation.validUntil < quotation.rfqExpired
            ? quotation.validUntil
            : !quotation.rfqExpired
            ? quotation.validUntil
            : quotation.rfqExpired;

        if (new Date() > new Date(expiredAt)) {
          throw new BadRequestException('RFQ is expired');
        }

        quotation.rfqStatus = RfqStatus.SUBMITTED;
        quotation.acceptedByUserId = user.userId;

        isSubmitted = true;

        Object.assign(notificationBody, {
          customerId: quotation.customerId,
          type: NotificationType.QUOTATION,
          rfqNumber: quotation.rfqNumber,
          countryFrom: quotation.countryFrom,
          countryTo: quotation.countryTo,
          actionStatus: NotificationActionStatus.QUOTATION_SUBMITTED,
          isRead: false,
          createdAt: new Date(),
          createdBy: user.userId,
        });
      }

      customerEmail = quotation.customer.email;
      isCustomerLoginable = quotation.customer.user?.customerLogin;
      delete quotation.customer;
    } else {
      // Step 2
      quotation = await query
        .andWhere(`q.rfqStatus = :rfqStatus`, { rfqStatus: RfqStatus.DRAFT })
        .getOne();

      if (!quotation) {
        throw new NotFoundException('Quotation not found');
      }
    }

    const isNle = quotation.affiliation === 'NLE'

    if (!isNle) {
      quotation.validUntil = validUntil;
    }
    quotation.updatedByUserId = user.userId;

    const bid = !isNle ?
      await this.bidRepo.findOne({ rfqId, status: 1 }) :
      await this.bidRepo.findOne({ rfqId, companyId: user.companyId, status: 1 });

    quotation.showSubtotal = showSubtotal;

    // case: user do "save as draft" beforeward
    if (bid) {
      if (isNle && bid.rfqStatus !== RfqStatus.SUBMITTED && bid.rfqStatus !== RfqStatus.COMPLETED) {
        throw new BadRequestException(
          'Only can update bidding with status waiting or submitted!',
        );
      }

      return await this.connection.transaction(async (entityManager) => {
        // delete previous bidPrices
        const previousBidPrices = await this.bidPriceRepo.find({
          bidId: bid.id,
          status: 1,
        });
        await entityManager.remove(previousBidPrices);

        // bulkCreate new bidPrices
        const bidPricesWithBidId = bidPrices.map((bidPrice) => {
          return { ...bidPrice, bidId: bid.id, createdByUserId: user.userId };
        });
        const newBidPrices = this.bidPriceRepo.create(bidPricesWithBidId);
        await entityManager.save(newBidPrices);

        // update bid
        Object.assign(bid, {
          shippingLine,
          vendorName,
          minDelivery,
          maxDelivery,
          note,
          validUntil,
          updatedByUserId: user.userId,
        });

        if (!isUpdate || (isUpdate && user.companyFeatureIds.includes(Features.TMS))) { // do not allow change currency once quotation submitted
          bid.currency = currency;
        }

        await entityManager.save(bid)
        await entityManager.save(quotation)

        await entityManager.save(bid);
        await entityManager.save(quotation);

        if (isUpdate) {
          // edit quotation
          const quotationData = await this.quotationsService.getDownloadData(
            quotation.rfqNumber,
            user
          );

          Object.assign(quotationData, {
            validUntil,
            ...bid,
            bidprices: newBidPrices,
            subtotal:
              newBidPrices?.reduce((acc, el) => acc + Number(el.total), 0) ?? 0,
          });

          if (
            !quotationData.customer.notificationSettingDisabled.find(
              (item) => item.name == 'QUOTATION_NEW',
            )
          ) {
            const pdf = await this.pdfService.createQuotation(quotationData);

            const origin = await this.originDestinationService.getCityCode(
              user.companyId,
              quotation.cityFrom,
              user.isTrial,
            );
            const destination = await this.originDestinationService.getCityCode(
              user.companyId,
              quotation.cityTo,
              user.isTrial,
            );

            const data = {
              isEdit: true,
              rfqNumber: quotation.rfqNumber,
              customerName: quotationData.customer.fullName,
              customerEmail: quotationData.customer.email,
              origin: origin.cityCode,
              destination: destination.cityCode,
              countryFrom: quotationData.countryFrom,
              cityFrom: quotationData.cityFrom,
              countryTo: quotationData.countryTo,
              cityTo: quotationData.cityTo,
              shipmentVia: quotation.shipmentVia,
              ffName: quotationData.company.name,
              ffLogo: quotationData.company.logo,
              ffEmail: quotationData.company.email,
              ffAddress: quotationData.company.address,
              ffPhoneCode: quotationData.company.phoneCode,
              ffPhoneNumber: quotationData.company.phoneNumber,
            };

            this.mailService.shareQuotation(customerEmail, pdf, data, true);
          }

          if (isSubmitted && user.customerModule && isCustomerLoginable) {
            this.notificationsService.create(notificationBody);
          }
        }

        return Object.assign(bid, { bidPrices: newBidPrices });
      });
    }

    // case: user do NOT do "save as draft" beforeward
    return await this.connection.transaction(async (entityManager) => {
      // create bid
      const bid = this.bidRepo.create({
        rfqId,
        shippingLine,
        vendorName,
        minDelivery,
        maxDelivery,
        note,
        validUntil,
        currency,
        companyId: user.companyId,
        rfqStatus: RfqStatus.SUBMITTED,
        createdByUserId: user.userId,
      });
      const newBid = await entityManager.save(bid);

      // bulkCreate bidPrices
      const bidPricesWithBidId = bidPrices.map((bidPrice) => {
        return { ...bidPrice, bidId: newBid.id, createdByUserId: user.userId };
      });
      const newBidPrices = this.bidPriceRepo.create(bidPricesWithBidId);

      await entityManager.save(newBidPrices);
      await entityManager.save(quotation);

      if (isNle) {
        await this.createRoomChatQuotation(
          quotation.rfqNumber,
          quotation.customerId,
          {
            id: user.companyId,
            name: user.companyName,
            affiliation: quotation.affiliation,
          },
        );
      }

      if (isUpdate) {
        // place quotation
        const quotationData = await this.quotationsService.getDownloadData(
          quotation.rfqNumber,
          user
        );

        Object.assign(quotationData, {
          validUntil,
          ...newBid,
          bidprices: newBidPrices,
          subtotal:
            newBidPrices?.reduce((acc, el) => acc + Number(el.total), 0) ?? 0,
        });

        if (
          !quotationData.customer.notificationSettingDisabled.find(
            (item) => item.name == 'QUOTATION_NEW',
          )
        ) {
          const pdf = await this.pdfService.createQuotation(quotationData);

          const origin = await this.originDestinationService.getCityCode(
            user.companyId,
            quotation.cityFrom,
            user.isTrial,
          );
          const destination = await this.originDestinationService.getCityCode(
            user.companyId,
            quotation.cityTo,
            user.isTrial,
          );

          const data = {
            isPlace: true,
            customerName: quotationData.customer.fullName,
            customerEmail: quotationData.customer.email,
            rfqNumber: quotation.rfqNumber,
            origin: origin.cityCode,
            destination: destination.cityCode,
            countryFrom: quotationData.countryFrom,
            cityFrom: quotationData.cityFrom,
            countryTo: quotationData.countryTo,
            cityTo: quotationData.cityTo,
            shipmentVia: quotation.shipmentVia,
            ffName: quotationData.company.name,
            ffLogo: quotationData.company.logo,
            ffEmail: quotationData.company.email,
            ffAddress: quotationData.company.address,
            ffPhoneCode: quotationData.company.phoneCode,
            ffPhoneNumber: quotationData.company.phoneNumber,
          };

          this.mailService.shareQuotation(customerEmail, pdf, data, true);
        }

        if (isSubmitted && user.customerModule && isCustomerLoginable) {
          this.notificationsService.create(notificationBody);
        }
      }

      return Object.assign(newBid, { bidPrices: newBidPrices });
    });
  }

  // create check chat room
  async createRoomChatQuotation(rfqNumber, customerId, company: any) {
    const checkCustomerChat = await this.chatCustomerRepo.findOne({
      where: {
        customerId,
        companyId: company.id,
      },
    });

    if (!checkCustomerChat) {
      await this.chatCustomerRepo.save({
        customerId: customerId,
        companyId: company.id,
        updatedAt: new Date(),
      });

      const checkChatRoom = await this.chatRoomRepo.findOne({
        where: {
          customerId,
          companyId: company.id,
          types: ChatRoomTypes.GENERAL,
        },
      });

      if (!checkChatRoom) {
        const chatRoom = await this.chatRoomRepo.save({
          customerId,
          companyId: company.id,
          affiliation: company.affiliation,
          types: ChatRoomTypes.GENERAL,
          unreadMessageFF: 1,
          lastMessage: 'Hello welcome to ' + company.name,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        //get all quotation file
        const quotation = await this.quotationRepo
          .createQueryBuilder('q')
          .leftJoinAndSelect('q.quotationFiles', 'qf')
          .where(`
            q.status = :quotationStatus
            AND q.rfqNumber = :rfqNumber
          `)
          .setParameters({
            quotationStatus: 1,
            rfqNumber,
          })
          .getOne();

        quotation.quotationFiles.forEach(async (quotationFile) => {
          const message = new this.chatModel({
            roomId: chatRoom.id,
            customerId,
            body: 'Attachment File',
            attachment: quotationFile.url,
            attachmentName: quotationFile.originalName,
            sender: ChatSenderTypes.FF,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          await message.save();
        });

        const message = new this.chatModel({
          roomId: chatRoom.id,
          customerId,
          body: chatRoom.lastMessage,
          sender: ChatSenderTypes.FF,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await message.save();
      }
    }

    const checkRoom = await this.chatRoomRepo.findOne({
      where: { rfqNumber, companyId: company.id },
    });

    if (!checkRoom) {
      const chatRoom = this.chatRoomRepo.create({
        customerId,
        companyId: company.id,
        affiliation: company.affiliation,
        types: ChatRoomTypes.QUOTATION,
        rfqNumber,
        unreadMessageFF: 0,
        lastMessage: 'Hello welcome to ' + company.name,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await this.chatRoomRepo.save(chatRoom);
    }
  }
}
