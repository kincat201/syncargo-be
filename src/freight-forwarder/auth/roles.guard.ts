import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEYS } from 'src/freight-forwarder/decorators/roles.decorator';
import { RoleFF } from '../../enums/enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRole = this.reflector.getAllAndOverride<RoleFF[]>(
      ROLES_KEYS,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRole) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    // console.log(user);

    return requiredRole.some((role) => user.role?.includes(role));
  }
}
