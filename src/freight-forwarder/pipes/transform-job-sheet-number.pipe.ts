import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class TransformJobSheetNumberPipe implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    // JHS-0001-0000001 => JHS/00001/00000001
    const [code, clientId, ...detail] = value.split('-');
    return `${code}/${clientId}/${detail}`;
  }
}
