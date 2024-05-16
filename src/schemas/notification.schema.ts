import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as Scm } from 'mongoose';
import {
  InvoiceStatus,
  NotificationActionStatus,
  NotificationType,
} from 'src/enums/enum';

export type NotificationDocument = Notification & Document;

@Schema()
export class Notification {
  @Prop({ default: 'FF', required: true })
  sender: string;

  @Prop({ type: String, required: false })
  ffName: string; // sender

  @Prop({ default: 'Customer', type: Scm.Types.Mixed, required: true })
  receipient: string;

  @Prop({ type: String, required: false })
  customerId: string;

  @Prop({ type: String, required: false })
  customerLogo: string;

  @Prop({ type: String, enum: Object.values(NotificationType), required: true })
  type: string;

  @Prop({
    type: String,
    enum: Object.values(NotificationActionStatus),
    required: true,
  })
  actionStatus: string;

  @Prop({ type: String, required: false })
  shipmentVia: string;

  @Prop({ type: String, required: false })
  rfqNumber: string;

  @Prop({ type: String, required: false })
  jobSheetNumber: string;

  @Prop({ type: String, required: false })
  invoiceNumber: string;

  @Prop({ type: String, enum: Object.values(InvoiceStatus), required: false })
  invoiceStatus: string;

  @Prop({ type: String, required: false })
  countryFromCode: string;

  @Prop({ type: String, required: false })
  countryFrom: string;

  @Prop({ type: String, required: false })
  countryToCode: string;

  @Prop({ type: String, required: false })
  countryTo: string;

  @Prop({ type: Boolean, required: false })
  isRead: boolean;

  @Prop({ type: Scm.Types.Mixed, required: true })
  createdAt: string;

  @Prop({ type: Number, required: true })
  createdBy: number;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
