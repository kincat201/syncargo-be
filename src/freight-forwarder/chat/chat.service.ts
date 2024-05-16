import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Chat, ChatDocument } from 'src/schemas/chat.schema';
import { Connection, QueryRunner, Repository } from 'typeorm';
import { S3Service } from '../../s3/s3.service';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { ChatCustomer } from '../../entities/chat-customer.entity';
import { ChatRoom } from '../../entities/chat-room.entity';
import {
  FilterCustomerDto,
  FilterFFDto,
  FilterMessageDto,
  FilterRoomDto,
} from './dto/filter-chat.dto';
import { Helper } from '../helpers/helper';
import { ChatMessageTypes, ChatSenderTypes } from '../../enums/chat';
import { CreateChatDto } from './dto/create-chat-dto';
import { QuotationFileSource, RfqStatus, Role } from '../../enums/enum';
import * as crypto from 'crypto';
import { QuotationFilesService } from '../quotation-files/quotation-files.service';

@Injectable()
export class ChatService {
  private queryRunner: QueryRunner;

  constructor(
    @InjectModel(Chat.name) private chatModel: Model<ChatDocument>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(ChatCustomer)
    private chatCustomerRepo: Repository<ChatCustomer>,
    @InjectRepository(ChatRoom) private chatRoomRepo: Repository<ChatRoom>,
    private quotationFilesService: QuotationFilesService,
    private connection: Connection,
    private helper: Helper,
    private readonly s3Service: S3Service,
  ) {
    this.queryRunner = this.connection.createQueryRunner();
  }

  async getNotificationChat(user: User, sender: string) {
    const totalUnreadMessage = await this.chatRoomRepo
      .createQueryBuilder('cr')
      .where('cr.status = :status', { status: 1 });

    if (sender == ChatSenderTypes.FF) {
      totalUnreadMessage.where('cr.companyId = :companyId', {
        companyId: user.companyId,
      });
      totalUnreadMessage.select([
        'SUM(cr.unreadMessageCustomer) AS unreadCustomer',
      ]);
    } else if (sender == ChatSenderTypes.CUSTOMER) {
      totalUnreadMessage.where('cr.customerId = :customerId', {
        customerId:
          user.role == Role.CUSTOMER ? user['userCustomerId'] : user.customerId,
      });
      totalUnreadMessage.select(['SUM(cr.unreadMessageFF) AS unreadFF']);
    }

    return totalUnreadMessage.getRawOne();
  }

  async getListChatFF(customerId: string, body: FilterFFDto) {
    let query = this.chatCustomerRepo
      .createQueryBuilder('cc')
      .innerJoin('cc.company', 'c')
      .where(
        `
          cc.customerId = :customerId
          AND cc.status = :status
          AND c.status = :status
        `,
      )
      .setParameters({
        customerId,
        status: 1,
      })
      .select([
        'c.name',
        'c.logo',
        'cc.companyId',
        'cc.unreadMessageFF',
        'cc.updatedAt',
      ])
      .orderBy('cc.updatedAt', 'DESC');

    if (body.search) {
      query.andWhere(`(c.name like :filter )`, { filter: `%${body.search}%` });
    }

    const list = await query.getMany();

    return { list };
  }

  async getListChatCustomer(user: User, body: FilterCustomerDto) {
    let query = this.chatCustomerRepo
      .createQueryBuilder('cc')
      .innerJoin('cc.customer', 'c')
      .innerJoin('c.user', 'u')
      .where(
        `
          cc.companyId = :companyId
          AND cc.status = :status
          AND c.status = :status
          AND u.status = :status
        `,
      )
      .setParameters({
        companyId: user.companyId,
        status: 1,
      })
      .select([
        'c.companyName',
        'c.fullName',
        'c.customerId',
        'c.userAffiliation',
        'u.photo',
        'cc.customerId',
        'cc.unreadMessage',
        'cc.updatedAt',
      ])
      .orderBy('cc.updatedAt', 'DESC');

    if (body.search) {
      query.andWhere(
        `(c.fullName like :filter or c.companyName like :filter)`,
        { filter: `%${body.search}%` },
      );
    }

    const list = [];

    for (const item of await query.getMany()) {
      if (item.customer.userAffiliation == 'NLE')
        item.customer.companyName = 'Customer NLE - ' + item.customerId;
      list.push(item);
    }

    return { list };
  }

  async getListChatRoom(user: User, body: FilterRoomDto) {
    if (user.affiliation == 'NLE' && !body.companyId)
      throw 'company id is required for customer NLE!';

    const query = this.chatRoomRepo
      .createQueryBuilder('cr')
      .innerJoin('cr.customer', 'c')
      .leftJoin('cr.quotation', 'q')
      .where(
        `
          cr.companyId = :companyId
          AND cr.customerId = :customerId
          AND cr.status = :status
          AND c.status = :status
          AND ( q.rfqStatus != :rfqStatus OR cr.rfqNumber is NULL )
        `,
      )
      .setParameters({
        customerId: body.customerId,
        companyId: user.affiliation == 'NLE' ? body.companyId : user.companyId,
        status: 1,
        rfqStatus: RfqStatus.DRAFT,
      })
      .select([
        'cr.id',
        'cr.types',
        'cr.rfqNumber',
        'cr.lastMessage',
        'cr.unreadMessageCustomer',
        'cr.unreadMessageFF',
        'cr.updatedAt',
        'q.shipmentVia',
        'q.shipmentType',
        'q.shipmentService',
        'q.countryFrom',
        'q.countryFromCode',
        'q.cityFrom',
        'q.countryTo',
        'q.countryToCode',
        'q.cityTo',
        'q.createdAt',
      ])
      .orderBy('cr.types', 'ASC')
      .addOrderBy('cr.updatedAt', 'DESC');

    if (body.search) {
      query.andWhere(`(cr.rfqNumber like :filter)`, {
        filter: `%${body.search}%`,
      });
    }

    if (body.isRead || body.isRead === 0) {
      if (body.isRead == 1) {
        query.andWhere(
          user.role == Role.CUSTOMER
            ? 'cr.unreadMessageFF = 0'
            : 'cr.unreadMessageCustomer = 0',
        );
      } else {
        query.andWhere(
          user.role == Role.CUSTOMER
            ? 'cr.unreadMessageFF > 0'
            : 'cr.unreadMessageCustomer > 0',
        );
      }
    }

    if (body.date) {
      const from = body.date.split('to')[0];
      const until = body.date.split('to')[1];
      query.andWhere(
        `(DATE(cr.updatedAt) >= :from AND DATE(cr.updatedAt) <= :until)`,
        { from, until },
      );
    }

    if (body.shipmentType) {
      if (body.shipmentType.includes('SEAFCL')) {
        query.andWhere(`(q.packingList like :shipmentType)`, {
          shipmentType: `%${body.shipmentType}%`,
        });
      } else {
        query.andWhere(`(q.shipmentType IN (:shipmentType))`, {
          shipmentType: body.shipmentType,
        });
      }
    }

    if (body.shipmentVia) {
      query.andWhere(`(q.shipmentVia IN (:shipmentVia))`, {
        shipmentVia: body.shipmentVia,
      });
    }

    if (body.origin) {
      query.andWhere(`(q.cityFrom = :origin)`, { origin: body.origin });
    }

    if (body.destination) {
      query.andWhere(`(q.cityTo = :destination)`, {
        destination: body.destination,
      });
    }

    return await query.getMany();
  }

  async getMessages(user: User, body: FilterMessageDto) {
    const chatRoom = await this.getChatRoomInfo(user, body.roomId);

    if (!chatRoom) throw new BadRequestException('Chat room not exist');

    let messages = await this.chatModel
      .find({
        roomId: body.roomId,
        status: 1,
      })
      .sort({ createdAt: -1 });

    if (body.limit && body.page) {
      const offset = body.limit * (body.page - 1);

      messages = await this.chatModel
        .find({
          roomId: body.roomId,
          status: 1,
        })
        .limit(body.limit)
        .skip(offset)
        .sort({ createdAt: -1 });
    }

    const result = [];

    for (const message of messages) {
      result.push(this.mappingMessageItem(message, chatRoom));
    }

    return result;
  }

  async createMessage(user: User, body: CreateChatDto) {
    const chatRoom = await this.getChatRoomInfo(user, body.roomId);

    if (!chatRoom) throw new BadRequestException('Chat room not exist');

    const message = new this.chatModel({
      ...body,
      customerId: chatRoom.customerId,
      companyId: chatRoom.companyId,
      sender:
        user.role === Role.CUSTOMER
          ? ChatSenderTypes.CUSTOMER
          : ChatSenderTypes.FF,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await message.save();

    await this.updateCountUnreadMessage(chatRoom, message, true, user);

    return {
      message: this.mappingMessageItem(message, chatRoom),
      chatRoom,
    };
  }

  async createMessageFile(user: User, body: CreateChatDto, file) {
    const chatRoom = await this.getChatRoomInfo(user, body.roomId);
    if (!chatRoom) throw 'Chat room not exist';

    const filenameSplit = file.name.split('.');
    const fileExt = '.' + filenameSplit[filenameSplit.length - 1];

    if (
      ![
        '.pdf',
        '.doc',
        '.docx',
        '.jpg',
        '.jpeg',
        '.xls',
        '.xlsx',
        '.png',
      ].includes(fileExt.toLowerCase())
    )
      throw 'Only allows upload doc, docx, xls, xlsx, pdf, png, jpg, or jpeg extension';
    const hashedFileName = `${crypto
      .randomBytes(32)
      .toString('hex')}${fileExt}`;

    if (chatRoom.rfqNumber) {
      file.originalname = file.name;

      const data = {
        file,
        fileExt,
        hashedFileName,
      };

      const uploadFile = await this.quotationFilesService.update(
        user.userId,
        user.affiliation == 'NLE' ? null : user.companyId,
        chatRoom.rfqNumber,
        null,
        [data],
        QuotationFileSource.CHAT,
      );

      body.attachment = uploadFile[0].url;
      body.attachmentName = uploadFile[0].originalName;
    } else {
      await this.s3Service.uploadFiles([{ file, hashedFileName }]);

      body.attachment = `${process.env.URL_S3}/saas/${hashedFileName}`;
      body.attachmentName = file.name;
    }

    const message = new this.chatModel({
      ...body,
      customerId: chatRoom.customerId,
      companyId: chatRoom.companyId,
      sender:
        user.role === Role.CUSTOMER
          ? ChatSenderTypes.CUSTOMER
          : ChatSenderTypes.FF,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await message.save();

    await this.updateCountUnreadMessage(chatRoom, message, true, user);

    return {
      message: this.mappingMessageItem(message, chatRoom),
      chatRoom,
    };
  }

  async readMessage(user: User, roomId) {
    const chatRoom = await this.getChatRoomInfo(user, roomId);

    if (!chatRoom) throw new BadRequestException('Chat room not exist');

    const update = await this.chatModel
      .find({
        roomId,
        status: 1,
        sender:
          user.role == Role.CUSTOMER
            ? ChatSenderTypes.FF
            : ChatSenderTypes.CUSTOMER,
        isRead: 0,
      })
      .updateMany({
        isRead: 1,
        updatedAt: new Date(),
      });

    await this.updateCountUnreadMessage(chatRoom, null, false, user);

    return {
      chatRoom,
      message: update ? 'Success Read Message' : 'Failed Read Message',
    };
  }

  async updateCountUnreadMessage(
    chatRoom: ChatRoom,
    message: ChatDocument,
    update = false,
    user: User,
  ) {
    const getUnreadMessage = await this.chatModel.aggregate().facet({
      totalUnreadCustomer: [
        {
          $match: {
            roomId: Number(chatRoom.id),
            sender: ChatSenderTypes.CUSTOMER,
            isRead: 0,
          },
        },
        {
          $count: 'total',
        },
      ],
      totalUnreadFF: [
        {
          $match: {
            roomId: Number(chatRoom.id),
            sender: ChatSenderTypes.FF,
            isRead: 0,
          },
        },
        {
          $count: 'total',
        },
      ],
    });

    const unreadMessage = getUnreadMessage[0];

    chatRoom.unreadMessageCustomer =
      unreadMessage.totalUnreadCustomer.length > 0
        ? unreadMessage.totalUnreadCustomer[0].total
        : 0;
    chatRoom.unreadMessageFF =
      unreadMessage.totalUnreadFF.length > 0
        ? unreadMessage.totalUnreadFF[0].total
        : 0;

    const chatCustomer = await this.chatCustomerRepo.findOne({
      where: {
        customerId: chatRoom.customerId,
      },
      select: ['id', 'customerId', 'companyId', 'unreadMessage'],
    });

    if (chatCustomer) {
      const getUnreadMessage = await this.chatModel.aggregate().facet({
        totalUnreadCustomer: [
          {
            $match: {
              sender: ChatSenderTypes.CUSTOMER,
              customerId: chatRoom.customerId,
              isRead: 0,
            },
          },
          {
            $count: 'total',
          },
        ],
        totalUnreadCustomerFF: [
          {
            $match: {
              sender: ChatSenderTypes.FF,
              customerId: chatRoom.customerId,
              companyId: chatRoom.companyId,
              isRead: 0,
            },
          },
          {
            $count: 'total',
          },
        ],
      });

      const unreadMessageCustomer = getUnreadMessage[0];

      chatCustomer.unreadMessage =
        unreadMessageCustomer.totalUnreadCustomer.length > 0
          ? unreadMessageCustomer.totalUnreadCustomer[0].total
          : 0;
      chatCustomer.unreadMessageFF =
        unreadMessageCustomer.totalUnreadCustomerFF.length > 0
          ? unreadMessageCustomer.totalUnreadCustomerFF[0].total
          : 0;
      if (update) chatCustomer.updatedAt = new Date();
      await this.chatCustomerRepo.save(chatCustomer);
    }

    if (message) chatRoom.lastMessage = message.body;

    const updateData = {
      unreadMessageCustomer:
        unreadMessage.totalUnreadCustomer.length > 0
          ? unreadMessage.totalUnreadCustomer[0].total
          : 0,
      unreadMessageFF:
        unreadMessage.totalUnreadFF.length > 0
          ? unreadMessage.totalUnreadFF[0].total
          : 0,
      lastMessage: message ? message.body : chatRoom.lastMessage,
    };

    if (update) updateData['updatedAt'] = new Date();

    await this.chatRoomRepo
      .createQueryBuilder('c')
      .update(ChatRoom)
      .set(updateData)
      .where('id = :roomId', { roomId: chatRoom.id })
      .execute();
  }

  mappingMessageItem(message, chatRoom) {
    return {
      id: message.id,
      roomId: chatRoom.id,
      sender: message.sender,
      body: message.body,
      attachment: message.attachment ? message.attachment : '',
      attachmentName: message.attachmentName ? message.attachmentName : '',
      messageType: message.messageType,
      referenceId: message.referenceId,
      isRead: message.isRead,
      createdAt: message.createdAt,
      name:
        message.sender == ChatSenderTypes.FF
          ? chatRoom.company.name
          : chatRoom.affiliation == 'NLE'
          ? 'Customer NLE - ' + chatRoom.customerId
          : chatRoom.customer.companyName,
      photo:
        message.sender == ChatSenderTypes.FF
          ? chatRoom.company.logo
          : chatRoom.customer?.user?.photo,
    };
  }

  async getChatRoomInfo(user: User, roomId = null, rfqNumber = null) {
    const chatRoom = await this.chatRoomRepo
      .createQueryBuilder('cr')
      .innerJoin('cr.customer', 'c')
      .innerJoin('c.user', 'u')
      .innerJoin('cr.company', 'cp')
      .leftJoin('cr.quotation', 'q')
      .where(
        `
          AND cr.status = :status
          AND c.status = :status
          AND u.status = :status
        `,
      )
      .setParameters({
        status: 1,
      })
      .select([
        'cr.id',
        'cr.lastMessage',
        'cr.customerId',
        'cr.companyId',
        'cr.rfqNumber',
        'cr.affiliation',
        'cp.name',
        'cp.logo',
        'c.companyName',
        'u.photo',
        'cp.createdAt',
      ]);

    if (roomId) chatRoom.where('cr.id = :roomId', { roomId });
    if (rfqNumber) chatRoom.where('cr.rfqNumber = :rfqNumber', { rfqNumber });

    return chatRoom.getOne();
  }

  async removeFileChat(fileUrls: string[]) {
    await this.chatModel.updateMany(
      {
        attachment: {
          $in: fileUrls
        }
      },
      {
        attachment: '',
        body: 'This file has been deleted',
        attachmentName: '',
      }
    );
  }
}
