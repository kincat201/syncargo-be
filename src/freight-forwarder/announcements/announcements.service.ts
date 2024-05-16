import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Announcement } from 'src/entities/announcement.entity';
import { Platform } from 'src/enums/enum';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement)
    private announcementRepo: Repository<Announcement>,
  ) {}

  async getOne() {
    return await this.announcementRepo
      .createQueryBuilder('a')
      .where(`
        a.startDate <= CURDATE() 
        AND CURDATE() <= a.expiryDate
        AND a.status = :status
        AND a.platform = :platform
      `, {
        status: true,
        platform: Platform.FF,
      })
      .select([
        'a.version AS version',
        'a.title AS title', 
        'a.description AS description', 
        'a.startDate AS createdAt',
      ])
      .orderBy('a.startDate', 'DESC')
      .getRawOne()
  }
}
