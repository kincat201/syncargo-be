import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { HeaderAPIKeyStrategy } from 'passport-headerapikey';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(HeaderAPIKeyStrategy) {
  constructor(private configService: ConfigService) {
    super(
      { header: 'X-Api-Key', prefix: 'Api-Key ' },
      false,
      (apiKey: string, done) => {
        if (apiKey !== this.configService.get('API_KEY')) {
          return done(false);
        }
        return done(true);
      },
    );
  }
}
