import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as Scm } from 'mongoose';
import { ChatMessageTypes } from '../enums/chat';

export type ChatDocument = Chat & Document;

@Schema()
export class Chat {

  @Prop({ type: Number, required: true })
  roomId: number;

  @Prop({ type: String })
  customerId: string;

  @Prop({ type: Number })
  companyId: number;

  @Prop({ type: String, required: true })
  sender: string;

  @Prop({ type: Scm.Types.Mixed })
  body: string;

  @Prop({ type: Scm.Types.Mixed })
  attachment: string;

  @Prop({ type: Scm.Types.Mixed })
  attachmentName: string;

  @Prop({ default:ChatMessageTypes.GENERAL })
  messageType: string; // GENERAL/QUOTATION/SHIPMENT/INVOICE

  @Prop({ type: String, required: false })
  referenceId: string;

  @Prop({
    default: 1,
  })
  status: number;

  @Prop({ type: Number, default: 0 })
  isRead: boolean;

  @Prop({ type: Scm.Types.Mixed })
  createdAt: string

  @Prop({ type: Scm.Types.Mixed })
  updatedAt: string;
}

export const ChatSchema = SchemaFactory.createForClass(Chat);