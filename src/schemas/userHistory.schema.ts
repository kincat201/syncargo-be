import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as Scm } from 'mongoose';

export type UserHistoryDocument = UserHistory & Document;

@Schema()
export class UserHistory {
  @Prop({ type: String, required: true  })
  ip: string

  @Prop({ type: String, required: true  })
  platform: string

  @Prop({ type: String })
  role: string

  @Prop({ type: String })
  subdomain: string

  @Prop({ type: Number})
  companyId: number;

  @Prop({ type: String})
  companyName: string;

  @Prop({ type: String})
  affiliation: string;

  @Prop({ type: String})
  customerId: string;
  
  @Prop({ type: String, required: true })
  fullName: string;

  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String })
  loginTime: string
  
  @Prop({ type: String })
  lastAccessTime: string;

  @Prop({ type: String, required: true  })
  createdAt: string
}

export const UserHistorySchema = SchemaFactory.createForClass(UserHistory);