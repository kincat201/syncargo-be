import { IsArray, IsBoolean } from 'class-validator';

export class RespondRemoveFileDto {
  @IsArray()
  attachmentIds: {
    id: number;
    fileSource: string;
  }[];

  @IsBoolean()
  approved: boolean;
}
