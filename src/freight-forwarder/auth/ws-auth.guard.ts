import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { User } from '../../entities/user.entity';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class WsAuthGuard extends AuthGuard('wsjwt') {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private redisService: RedisService,
    private jwtService: JwtService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const token = req?.handshake?.auth?.token;
    const payload = JSON.parse(JSON.stringify(this.jwtService.decode(token)));

    if (!token) {
      throw new UnauthorizedException(
        'Unauthorized access to this resource, please set appropriate headers',
      );
    }

    const cache = await this.redisService.checkSession(token);
    if (!cache?.length) {
      throw new UnauthorizedException();
    }
    await this.redisService.extendSession(token);

    req.user = payload;

    return true;
  }
}
