import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { RedisModule } from '../../redis/redis.module';
import { CompaniesModule } from 'src/freight-forwarder/companies/companies.module';
import { RolesGuard } from './roles.guard';
import { MongooseModule } from '@nestjs/mongoose';
import { UserHistory, UserHistorySchema } from 'src/schemas/userHistory.schema';
import { ApiKeyStrategy } from './api-key.strategy';
import { SubscriptionHistory } from 'src/entities/subscription-history.entity';
import { AnnouncementsModule } from '../announcements/announcements.module';
import { NleModule } from '../nle/nle.module';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    TypeOrmModule.forFeature([User, SubscriptionHistory]),
    MongooseModule.forFeature([
      { name: UserHistory.name, schema: UserHistorySchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: `${configService.get('JWT_EXPIRATION_TIME')}s`,
        },
      }),
    }),
    RedisModule,
    CompaniesModule,
    AnnouncementsModule,
    NleModule,
  ],
  providers: [AuthService, JwtStrategy, RolesGuard, ApiKeyStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
