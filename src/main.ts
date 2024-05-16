import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { config } from 'aws-sdk';
import { json } from 'body-parser';
import * as requestIp from 'request-ip';
// import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { AllExceptionsFilter } from './freight-forwarder/filters/all-exceptions.filter';

const whitelist = [
//   '.syncargo.com',
  'http://localhost:3000',
  'http://localhost:3002',
  'http://localhost:8080',
  //   'https://dev-saas.syncargo.com',
  //   'https://dev-saas.syncargo.com/',
  //   'https://staging-saas.syncargo.com',
  //   'https://staging-saas.syncargo.com/',
  //   'https://uat-saas.syncargo.com',
  //   'https://uat-saas.syncargo.com/',
  //   'https://demo-saas.syncargo.com',
  //   'https://demo-saas.syncargo.com/',
  //   '*.syncargo.com',
  //   '*.syncargo.com/',
];

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: (origin, callback) => {
      if (origin && whitelist.indexOf(origin) !== -1) {
        callback(null, true);
        return;
      } else if (!origin) {
        callback(null, true);
        return;
      } else if (/^(https:\/\/([^\.]*\.)?syncargo\.com)$/i) {
        callback(null, true);
        return;
      }
      callback(new Error('Not Allowed by Cors'));
    },
    // origin: /^(https:\/\/([^\.]*\.)?syncargo\.com)$/i,
  })

  const configService = app.get(ConfigService);
  config.update({
    accessKeyId: configService.get('AWS_ACCESS_KEY'),
    secretAccessKey: configService.get('AWS_SECRET_KEY'),
    region: configService.get('AWS_REGION'),
  });
  app.use(json({ limit: '10mb'}))
  app.use(requestIp.mw())
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.useGlobalFilters(new AllExceptionsFilter())
//   app.useGlobalFilters(new AllExceptionsFilter())
  app.setGlobalPrefix('api/v1');
  await app.listen(process.env.PORT);
}
bootstrap();
