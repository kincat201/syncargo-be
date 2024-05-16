import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class TransformRfqNumberPipe implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    // ORD-068-20220412-00000001 => ORD/068/20220412-00000001
    if(!value) return null;
    const [code, clientId, ...detail] = value.split('-');
    return `${code}/${clientId}/${detail.join('-')}`;
  }
}
