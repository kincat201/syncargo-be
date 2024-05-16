import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/entities/user.entity';
import { Role } from 'src/enums/enum';
import { SubscriptionHistory } from 'src/entities/subscription-history.entity';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(SubscriptionHistory)
    private subscriptionHistoryRepo: Repository<SubscriptionHistory>,
    private readonly redisService: RedisService,
  ) {
    super({
      secretOrKey: configService.get('JWT_SECRET'),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: true, // reason: reset ttl redis session
    });
  }

  async validate(payload: any) {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .innerJoin('u.company', 'c', 'c.status = :status')
      .select(['u.userId', 'u.affiliation', 'u.companyId'])
      .where(
        `u.userId = :userId
        AND u.role NOT IN (:...roles)
        AND u.status = :status`,
      )
      .setParameters({
        userId: payload.userId,
        roles: [Role.SUPER_ADMIN, Role.CUSTOMER],
        status: 1,
      })
      .getOne();

    if (!user) {
      throw new UnauthorizedException();
    }

    const subscription = await this.subscriptionHistoryRepo
      .createQueryBuilder('sh')
      .where(
        `
        sh.companyId = :companyId
        AND sh.activeDate <= CURDATE()
        AND CURDATE() < sh.expiryDate 
      `,
        { companyId: user.companyId },
      )
      .select(['sh.id'])
      .orderBy('sh.activeDate', 'ASC')
      .limit(1)
      .getOne();

    if (!subscription && !payload.isTrial) {
      await this.redisService.deleteSessions(user.affiliation, user.userId);
      throw new UnauthorizedException();
    }

    return {
      companyId: payload.companyId,
      companyFeatureIds: payload.companyFeatureIds,
      companyName: payload.companyName,
      companyLogo: payload.companyLogo,
      subdomain: payload.subdomain,
      customerModule: payload.customerModule,
      customerSubdomain: payload.customerSubdomain,
      userId: payload.userId,
      fullName: payload.fullName,
      email: payload.email,
      phoneCode: payload.phoneCode,
      phoneNumber: payload.phoneNumber,
      affiliation: payload.affiliation,
      role: payload.role,
      userStatus: payload.userStatus,
      status: payload.status,
      subtotalQuotation: payload.subtotalQuotation,
      isTrial: payload.isTrial,
      isTrialExpired : payload.length,
    };
  }
}
