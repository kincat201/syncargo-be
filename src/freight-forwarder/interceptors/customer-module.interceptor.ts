import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  UseInterceptors,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable } from 'rxjs';

import { Company } from 'src/entities/company.entity';

// NOTE: use this interceptor to get customerModule status in real time
// interceptors are excecuted after guards
@Injectable()
export class CustomerModuleInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(Company) private companyRepo: Repository<Company>,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest();
    const { companyId } = req.user;

    const company = await this.companyRepo
      .createQueryBuilder('c')
      .where(`c.id = :companyId AND c.status = :status`)
      .select(['c.customerModule'])
      .setParameters({ companyId, status: 1 })
      .getOne();

    req.user.customerModule = company.customerModule;

    return next.handle();
  }
}
