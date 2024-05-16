import {
  IsDefined,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ChatMessageTypes } from '../../../enums/chat';

export class CreateChatDto {
  @IsString()
  roomId: string;

  @IsOptional()
  @IsString()
  body: string;

  @IsOptional()
  @IsString()
  attachment: string;

  @IsOptional()
  @IsString()
  attachmentName: string;

  @IsDefined()
  @IsEnum(ChatMessageTypes, {
    message: `Please pick any one of this (${ChatMessageTypes.GENERAL} or ${ChatMessageTypes.QUOTATION} or ${ChatMessageTypes.SHIPMENT} or ${ChatMessageTypes.INVOICE})`,
  })
  @IsString()
  messageType: string;

  @IsOptional()
  @IsString()
  referenceId: number;
}
