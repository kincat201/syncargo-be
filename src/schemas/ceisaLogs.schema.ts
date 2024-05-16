import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as Scm } from 'mongoose';

export type CeisaLogsDocument = CeisaLogs & Document;

@Schema()
export class CeisaLogs {

  @Prop({ type: String, required: true })
  url: string;

  @Prop({ type: String, required: true })
  types: string;

  @Prop({ type: Scm.Types.Mixed })
  headers: string;

  @Prop({ type: Scm.Types.Mixed })
  request: string;

  @Prop({ type: Scm.Types.Mixed })
  response: string;

  @Prop({ type: Scm.Types.Mixed })
  startTime: string

  @Prop({ type: Scm.Types.Mixed })
  endTime: string;
}

export const CeisaLogsSchema = SchemaFactory.createForClass(CeisaLogs);