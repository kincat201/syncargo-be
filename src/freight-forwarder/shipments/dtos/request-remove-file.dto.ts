import { IsNumber } from 'class-validator';

export class RequestRemoveFileDto {
  @IsNumber({}, { each: true })
  attachmentIds: number[];
}
