import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/freight-forwarder/auth/auth.guard';
import { JwtAuthGuard } from 'src/freight-forwarder/auth/jwt-auth.guard';

export function Auth() {
  return applyDecorators(UseGuards(AuthGuard, JwtAuthGuard));
}
