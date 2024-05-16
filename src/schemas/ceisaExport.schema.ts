import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as Scm } from 'mongoose';

export type CeisaExportDocument = CeisaExport & Document;

@Schema()
export class CeisaExport {

  @Prop({ type: String })
  attribute: string;

  @Prop({ type: String })
  type: string;

  @Prop({ type: Scm.Types.Mixed })
  description: string;

  @Prop({ type: Scm.Types.Mixed })
  message: string;

  @Prop({ type: Scm.Types.Mixed })
  enum: string;

  @Prop({ type: Number })
  required: string

  @Prop({ type: String })
  section: string;
}

export const CeisaExportSchema = SchemaFactory.createForClass(CeisaExport);