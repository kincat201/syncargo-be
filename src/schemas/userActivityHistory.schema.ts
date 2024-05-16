import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as Scm } from 'mongoose';

export type UserActivityDocument = UserActivity & Document;

@Schema()
export class UserActivity {
  @Prop({ type: String, required: true })
  ip: string;

  @Prop({ type: String, required: true })
  platform: string;

  @Prop({ type: String })
  subdomain: string;

  @Prop({ type: Number })
  companyId: number;

  @Prop({ type: String })
  companyName: string;

  @Prop({ type: String })
  customerId: string;

  @Prop({ type: String, required: true })
  fullName: string;

  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String })
  token: string;

  @Prop({ type: Scm.Types.Mixed })
  activity: string;

  @Prop({ type: String, required: true })
  createdAt: string;
}

export const UserActivitySchema = SchemaFactory.createForClass(UserActivity);
