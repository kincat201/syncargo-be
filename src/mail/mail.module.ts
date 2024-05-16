import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import * as AWS from 'aws-sdk';

import { MailService } from './mail.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          SES: new AWS.SES({
            accessKeyId: configService.get('AKI_SES_KEY'),
            secretAccessKey: configService.get('AWS_SES_SECRET'),
            region: configService.get('AWS_REGION'),
          }),
        },
        defaults: {
          from: 'Syncargo <no-reply@syncargo.com>',
        },
      }),
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
