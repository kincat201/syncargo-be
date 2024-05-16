import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as Scm } from 'mongoose';

export type NleLogsDocument = NleLogs & Document;

@Schema()
export class NleLogs {

  @Prop({ type: String, required: true })
  url: string;

  @Prop({ type: String, required: true })
  types: string;

  @Prop({ type: Scm.Types.Mixed })
  header: string;

  @Prop({ type: Scm.Types.Mixed })
  request: string;

  @Prop({ type: Scm.Types.Mixed })
  response: string;

  @Prop({ type: Scm.Types.Mixed })
  startTime: string

  @Prop({ type: Scm.Types.Mixed })
  endTime: string;
}

export const NleLogsSchema = SchemaFactory.createForClass(NleLogs);