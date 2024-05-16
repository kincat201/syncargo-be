import { SetMetadata } from '@nestjs/common';
import { RoleFF } from '../../enums/enum';

export const ROLES_KEYS = 'roles';
export const Roles = (...roles: RoleFF[]) => SetMetadata(ROLES_KEYS, roles);
