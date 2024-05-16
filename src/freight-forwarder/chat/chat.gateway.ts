import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { WsAuthGuard } from '../auth/ws-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { ChatService } from './chat.service';
import {
  ChatEventEmit,
  ChatEventListener,
  ChatSenderTypes,
} from '../../enums/chat';
import {
  FilterCustomerDto,
  FilterFFDto,
  FilterMessageDto,
  FilterRoomDto,
} from './dto/filter-chat.dto';
import { Role } from '../../enums/enum';
import { Buffer } from 'buffer';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'api/v1/freight-forwarder/chat',
  allowUpgrade: true,
  transports: ['polling', 'websocket'],
  maxHttpBufferSize: 1e8,
})
@UseGuards(WsAuthGuard)
export class ChatGateway implements OnGatewayInit {
  constructor(private readonly chatService: ChatService) {}

  @WebSocketServer() wss: Server;

  private logger: Logger = new Logger('ChatGateway');

  afterInit(server: any) {
    this.logger.log('Initialized!');
  }

  @SubscribeMessage(ChatEventListener.JOIN_COMPANY)
  handleCompanyJoin(
    @ConnectedSocket() client: Socket,
    @CurrentUser() user: User,
  ) {
    client.join('COMPANY_' + user.companyId.toString());
    client.emit(
      ChatEventEmit.JOINED_COMPANY,
      'COMPANY_' + user.companyId.toString(),
    );
  }

  @SubscribeMessage(ChatEventListener.LEAVE_COMPANY)
  handleCompanyLeave(
    @ConnectedSocket() client: Socket,
    @CurrentUser() user: User,
  ) {
    client.leave('COMPANY_' + user.companyId.toString());
    client.emit(
      ChatEventEmit.LEFT_COMPANY,
      'COMPANY_' + user.companyId.toString(),
    );
  }

  @SubscribeMessage(ChatEventListener.GET_LIST_FF)
  async getListFF(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: FilterFFDto,
    @CurrentUser() user: User,
  ) {
    await this.setFFList(user, body);
  }

  @SubscribeMessage(ChatEventListener.GET_LIST_CUSTOMER)
  async getListCustomer(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: FilterCustomerDto,
    @CurrentUser() user: User,
  ) {
    await this.setCustomerList(user, body);
  }

  @SubscribeMessage(ChatEventListener.JOIN_CUSTOMER)
  handleCustomerJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() customerId: string,
    @CurrentUser() user: User,
  ) {
    client.join('CUSTOMER_' + customerId);
    client.emit(ChatEventEmit.JOINED_CUSTOMER, 'CUSTOMER_' + customerId);
  }

  @SubscribeMessage(ChatEventListener.LEAVE_CUSTOMER)
  handleCustomerLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() customerId: string,
    @CurrentUser() user: User,
  ) {
    client.leave('CUSTOMER_' + customerId);
    client.emit(ChatEventEmit.LEFT_CUSTOMER, 'CUSTOMER_' + customerId);
  }

  @SubscribeMessage(ChatEventListener.GET_LIST_ROOM)
  async getListRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: FilterRoomDto,
    @CurrentUser() user: User,
  ) {
    try {
      this.wss
        .to('CUSTOMER_' + body.customerId)
        .emit(
          user.role === Role.CUSTOMER
            ? ChatEventEmit.SET_LIST_ROOM_CUSTOMER
            : ChatEventEmit.SET_LIST_ROOM_FF,
          await this.chatService.getListChatRoom(user, body),
        );
    } catch (e) {
      this.wss
        .to('CUSTOMER_' + body.customerId)
        .emit(
          user.role === Role.CUSTOMER
            ? ChatEventEmit.SET_LIST_ROOM_CUSTOMER
            : ChatEventEmit.SET_LIST_ROOM_FF,
          false,
          e,
        );
    }
  }

  @SubscribeMessage(ChatEventListener.JOIN_ROOM)
  async handleRoomJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() room: string,
    @CurrentUser() user: User,
  ) {
    const checkRoom = await this.chatService.getChatRoomInfo(user, room);
    if (!checkRoom) {
      client.emit(ChatEventEmit.JOINED_ROOM, false, 'room is not found');
      return;
    }
    client.join('ROOM_' + checkRoom.id);
    client.emit(ChatEventEmit.JOINED_ROOM, 'ROOM_' + checkRoom.id);
  }

  @SubscribeMessage(ChatEventListener.JOIN_ROOM_FLOATING)
  async handleRoomFloatingJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() rfqNumber: string,
    @CurrentUser() user: User,
  ) {
    const checkRoom = await this.chatService.getChatRoomInfo(
      user,
      null,
      rfqNumber,
    );
    if (!checkRoom) {
      client.emit(
        ChatEventEmit.JOINED_ROOM_FLOATING,
        false,
        'room is not found',
      );
      return;
    }
    client.join('ROOM_' + checkRoom.id);
    client.emit(ChatEventEmit.JOINED_ROOM_FLOATING, 'ROOM_' + checkRoom.id);
  }

  @SubscribeMessage(ChatEventListener.LEAVE_ROOM)
  handleRoomLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() room: string,
    @CurrentUser() user: User,
  ) {
    client.leave('ROOM_' + room);
    client.emit(ChatEventEmit.LEFT_ROOM, 'ROOM_' + room);
  }

  @SubscribeMessage(ChatEventListener.GET_LIST_MESSAGE)
  async handleGetMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: FilterMessageDto,
    @CurrentUser() user: User,
  ) {
    this.wss
      .to('ROOM_' + body.roomId)
      .emit(
        user.role === Role.CUSTOMER
          ? ChatEventEmit.SET_LIST_MESSAGE_CUSTOMER
          : ChatEventEmit.SET_LIST_MESSAGE_FF,
        await this.chatService.getMessages(user, body),
      );
  }

  @SubscribeMessage(ChatEventListener.CHAT_TO_ROOM_SERVER)
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: any,
    @CurrentUser() user: User,
  ) {
    const result = await this.chatService.createMessage(user, body[0]);
    await this.sendCallbackToClient(user, result, body);
  }

  @SubscribeMessage(ChatEventListener.CHAT_TO_ROOM_SERVER_FILE)
  async handleMessageFile(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: any,
    @CurrentUser() user: User,
  ) {
    try {
      for (const item of body[0].file) {
        if (Buffer.byteLength(item.buffer) > 5e6)
          throw 'This file capacity more than 5mb';
        const result = await this.chatService.createMessageFile(
          user,
          body[0],
          item,
        );
        await this.sendCallbackToClient(user, result, body);
      }
    } catch (e) {
      // add to list message
      this.wss
        .to('ROOM_' + body[0].roomId)
        .emit(ChatEventEmit.CHAT_TO_ROOM_CLIENT, false, e);
    }
  }

  @SubscribeMessage(ChatEventListener.READ_CHAT_MESSAGE)
  async handleReadChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: any,
    @CurrentUser() user: User,
  ) {
    const result = await this.chatService.readMessage(user, body[0]);
    this.wss
      .to('ROOM_' + body[0])
      .emit(ChatEventEmit.SET_READ_CHAT_MESSAGE, result.message);

    const updatedChatRoom = await this.getUpdateChatRoom(
      user,
      result,
      body[1]
        ? body[1]
        : {
            customerId: result.chatRoom.customerId,
            companyId: result.chatRoom.companyId,
          },
    );
    if (user.role == Role.CUSTOMER) {
      this.wss
        .to('CUSTOMER_' + result.chatRoom.customerId)
        .emit(ChatEventEmit.SET_LIST_ROOM_CUSTOMER, updatedChatRoom);
      if (result.chatRoom.affiliation == 'NLE')
        await this.setFFList(
          user,
          body[2] ? body[2] : new FilterFFDto(),
          result.chatRoom.customerId,
        );
    } else {
      this.wss
        .to('CUSTOMER_' + result.chatRoom.customerId)
        .emit(ChatEventEmit.SET_LIST_ROOM_FF, updatedChatRoom);
      await this.setCustomerList(
        user,
        body[2] ? body[2] : new FilterCustomerDto(),
      );
    }
    await this.getNotifyBySelf(user);
  }

  @SubscribeMessage(ChatEventListener.GET_NOTIFICATION_CHAT)
  async getNotificationChat(
    @ConnectedSocket() client: Socket,
    @CurrentUser() user: User,
  ) {
    // get notify by self
    await this.getNotifyBySelf(user);
  }

  async getNotifyBySelf(user) {
    if (user.role == Role.CUSTOMER) {
      this.wss
        .to('CUSTOMER_' + user['userCustomerId'].toString())
        .emit(
          user.role === Role.CUSTOMER
            ? ChatEventEmit.SET_NOTIFICATION_CHAT_CUSTOMER
            : ChatEventEmit.SET_NOTIFICATION_CHAT_FF,
          await this.chatService.getNotificationChat(
            user,
            user.role == Role.CUSTOMER
              ? ChatSenderTypes.CUSTOMER
              : ChatSenderTypes.FF,
          ),
        );
    } else {
      this.wss
        .to('COMPANY_' + user.companyId.toString())
        .emit(
          user.role === Role.CUSTOMER
            ? ChatEventEmit.SET_NOTIFICATION_CHAT_CUSTOMER
            : ChatEventEmit.SET_NOTIFICATION_CHAT_FF,
          await this.chatService.getNotificationChat(
            user,
            user.role == Role.CUSTOMER
              ? ChatSenderTypes.CUSTOMER
              : ChatSenderTypes.FF,
          ),
        );
    }
  }

  async getUpdateChatRoom(user, result, filter: FilterRoomDto) {
    return await this.chatService.getListChatRoom(user, filter);
  }

  async setFFList(user, filter: FilterFFDto, customerId = null) {
    customerId = customerId ? customerId : user['userCustomerId'];
    this.wss
      .to('CUSTOMER_' + customerId.toString())
      .emit(
        ChatEventEmit.SET_LIST_FF,
        await this.chatService.getListChatFF(customerId, filter),
      );
  }

  async setCustomerList(user, filter: FilterCustomerDto) {
    this.wss
      .to('COMPANY_' + user.companyId.toString())
      .emit(
        ChatEventEmit.SET_LIST_CUSTOMER,
        await this.chatService.getListChatCustomer(user, filter),
      );
  }

  async sendCallbackToClient(user, result, body) {
    // add to list message
    this.wss
      .to('ROOM_' + body[0].roomId)
      .emit(ChatEventEmit.CHAT_TO_ROOM_CLIENT, result.message);

    const updatedChatRoomSelf = await this.getUpdateChatRoom(
      user,
      result,
      body[1]
        ? body[1]
        : {
            customerId: result.chatRoom.customerId,
            companyId: result.chatRoom.companyId,
          },
    );
    const filterRoom = new FilterRoomDto();
    filterRoom.customerId = result.chatRoom.customerId;
    filterRoom.companyId = result.chatRoom.companyId;
    const updatedChatRoomClient = await this.getUpdateChatRoom(
      user,
      result,
      filterRoom,
    );

    // update both room info
    this.wss
      .to('CUSTOMER_' + result.chatRoom.customerId)
      .emit(
        ChatEventEmit.SET_LIST_ROOM_CUSTOMER,
        user.role == Role.CUSTOMER
          ? updatedChatRoomSelf
          : updatedChatRoomClient,
      );
    this.wss
      .to('CUSTOMER_' + result.chatRoom.customerId)
      .emit(
        ChatEventEmit.SET_LIST_ROOM_FF,
        user.role != Role.CUSTOMER
          ? updatedChatRoomSelf
          : updatedChatRoomClient,
      );

    // update notify to client
    user.customerId = result.chatRoom.customerId;
    if (user.role == Role.CUSTOMER) {
      user.companyId = result.chatRoom.companyId;
      this.wss
        .to('COMPANY_' + result.chatRoom.companyId.toString())
        .emit(
          ChatEventEmit.SET_NOTIFICATION_CHAT_FF,
          await this.chatService.getNotificationChat(
            user,
            user.role == Role.CUSTOMER
              ? ChatSenderTypes.FF
              : ChatSenderTypes.CUSTOMER,
          ),
        );
    } else {
      this.wss
        .to('CUSTOMER_' + result.chatRoom.customerId.toString())
        .emit(
          ChatEventEmit.SET_NOTIFICATION_CHAT_CUSTOMER,
          await this.chatService.getNotificationChat(
            user,
            user.role == Role.CUSTOMER
              ? ChatSenderTypes.FF
              : ChatSenderTypes.CUSTOMER,
          ),
        );
    }

    // if customer update customer info
    if (user.role == Role.CUSTOMER)
      await this.setCustomerList(
        user,
        user.role == Role.CUSTOMER || !body[2]
          ? new FilterCustomerDto()
          : body[2],
      );

    // if FF update chat for NLE
    if (user.role != Role.CUSTOMER && result.chatRoom.affiliation == 'NLE')
      await this.setFFList(
        user,
        body[2] ? body[2] : new FilterFFDto(),
        result.chatRoom.customerId,
      );
  }
}
