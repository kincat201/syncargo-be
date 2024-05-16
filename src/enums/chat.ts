export enum ChatRoomTypes {
  GENERAL = 'GENERAL',
  QUOTATION = 'QUOTATION',
}

export enum ChatSenderTypes {
  CUSTOMER = 'CUSTOMER',
  FF = 'FF',
}

export enum ChatMessageTypes {
  GENERAL = 'GENERAL',
  QUOTATION = 'QUOTATION',
  SHIPMENT = 'SHIPMENT',
  INVOICE = 'INVOICE',
}

export enum ChatEventListener {
  JOIN_COMPANY = 'JOIN_COMPANY',
  LEAVE_COMPANY= 'LEAVE_COMPANY',
  JOIN_CUSTOMER = 'JOIN_CUSTOMER',
  LEAVE_CUSTOMER= 'LEAVE_CUSTOMER',
  JOIN_ROOM = 'JOIN_ROOM',
  JOIN_ROOM_FLOATING = 'JOIN_ROOM_FLOATING',
  LEAVE_ROOM = 'LEAVE_ROOM',
  GET_LIST_FF = 'GET_LIST_FF',
  GET_LIST_CUSTOMER = 'GET_LIST_CUSTOMER',
  GET_LIST_ROOM = 'GET_LIST_ROOM',
  GET_LIST_MESSAGE = 'GET_LIST_MESSAGE',
  CHAT_TO_ROOM_SERVER = 'CHAT_TO_ROOM_SERVER',
  CHAT_TO_ROOM_SERVER_FILE = 'CHAT_TO_ROOM_SERVER_FILE',
  READ_CHAT_MESSAGE = 'READ_CHAT_MESSAGE',
  GET_NOTIFICATION_CHAT = 'GET_NOTIFICATION_CHAT',
}

export enum ChatEventEmit {
  JOINED_COMPANY = 'JOINED_COMPANY',
  LEFT_COMPANY = 'LEFT_COMPANY',
  JOINED_CUSTOMER = 'JOINED_CUSTOMER',
  LEFT_CUSTOMER= 'LEFT_CUSTOMER',
  JOINED_ROOM = 'JOINED_ROOM',
  JOINED_ROOM_FLOATING = 'JOINED_ROOM_FLOATING',
  LEFT_ROOM = 'LEFT_ROOM',
  SET_LIST_FF = 'SET_LIST_FF',
  SET_LIST_CUSTOMER = 'SET_LIST_CUSTOMER',
  SET_LIST_ROOM_FF = 'SET_LIST_ROOM_FF',
  SET_LIST_ROOM_CUSTOMER = 'SET_LIST_ROOM_CUSTOMER',
  SET_LIST_MESSAGE_FF = 'SET_LIST_MESSAGE_FF',
  SET_LIST_MESSAGE_CUSTOMER = 'SET_LIST_MESSAGE_CUSTOMER',
  CHAT_TO_ROOM_CLIENT = 'CHAT_TO_ROOM_CLIENT',
  SET_READ_CHAT_MESSAGE = 'SET_READ_CHAT_MESSAGE',
  SET_NOTIFICATION_CHAT_FF = 'SET_NOTIFICATION_CHAT_FF',
  SET_NOTIFICATION_CHAT_CUSTOMER = 'SET_NOTIFICATION_CHAT_CUSTOMER',
}