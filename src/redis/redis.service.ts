import { CACHE_MANAGER, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager'

@Injectable()
export class RedisService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {}

  async set(key: string, value: string, ttl: number) {
    // ttl => expiration time in seconds
    return await this.cacheManager.set(key, value, { ttl });
  }
  
  async get(key: string) {
    return await this.cacheManager.get(key);
  }

  async del(key: string) {
    return await this.cacheManager.del(key);
  }

  async checkSession(token: string) {
    return await this.cacheManager.store.keys(`session-*:*-${token}`)
  }

  async extendSession(token: string) {
    const keys = await this.cacheManager.store.keys(`session-*:*-${token}`)
    if (!keys.length) {
      throw new UnauthorizedException()
    }
    const affiliation = keys[0].split('-')[1].split(':')[0]
    const userId = keys[0].split('-')[1].split(':')[1]
    const ttl = await this.configService.get('CACHE_TTL')
    return await this.cacheManager.set(`session-${affiliation}:${userId}-${token}`, token, { ttl })
  }

  async deleteSessions(affiliation: string, userId: number) {
    const keys = await this.cacheManager.store.keys(`session-${affiliation}:${userId}-*`)
    keys.forEach((key: string) => this.cacheManager.del(key))
  }

}
