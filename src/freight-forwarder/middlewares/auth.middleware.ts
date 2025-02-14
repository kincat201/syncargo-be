import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import * as passport from 'passport';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    passport.authenticate(
      'headerapikey',
      { session: false, failureRedirect: '/api/v1/unauthorized' },
      (value) => {
        if (!value) {
          throw new UnauthorizedException();
        }
        next();
      },
    )(req, res, next);
  }
}
