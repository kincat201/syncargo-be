import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import axios from 'axios';
import {
  CannotCreateEntityIdMapError,
  EntityNotFoundError,
  QueryFailedError,
  TypeORMError,
} from 'typeorm';
import { SlackEndpoint } from 'src/enums/enum';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    let message = (exception as any).message.message;
    let code = 'Internal Server Error';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= 500 && status <= 599) {
      Logger.error(
        message,
        (exception as any).stack,
        `${request.method} ${request.url}`,
      );
    }

    if (exception instanceof HttpException) {
      status = (exception as HttpException).getStatus();
      message = (exception as any).message;
      code = (exception as any).code;
    } else if (exception instanceof TypeORMError) {
      switch (exception.constructor) {
        case EntityNotFoundError:
          status = HttpStatus.NOT_FOUND;
          message = `${
            (exception as EntityNotFoundError).message
              .split(':')[0]
              .split('"')[1]
          } not found`;
          code = 'Not Found';
          break;
        case QueryFailedError:
          status = HttpStatus.UNPROCESSABLE_ENTITY;
          message = (exception as QueryFailedError).message;
          code = (exception as any).code;
          break;
        // case CannotCreateEntityIdMapError:
        //   status = HttpStatus.UNPROCESSABLE_ENTITY
        //   message = (exception as CannotCreateEntityIdMapError).message;
        //   code = (exception as any).code;
        //   break;
      }
    }

    if (((status >= 500 && status <= 599) || status === 422) && process.env.NODE_ENV != 'development') {
      console.log(
        `${process.env.SLACK_SERVICE_BASE_URL}/slack/${SlackEndpoint.SEND_NOTIFICATION}`,
        {
          module: 'FF',
          errorName: (exception as any).name,
          errorRoute: request.route.path,
          errorStackTrace: (exception as any).stack,
        },
        {
          headers: {
            ['api-key']: process.env.SLACK_SERVICE_API_KEY,
          },
        }
      );
      axios.post(
        `${process.env.SLACK_SERVICE_BASE_URL}/slack/${SlackEndpoint.SEND_NOTIFICATION}`,
        {
          module: 'FF',
          errorName: (exception as any).name,
          errorRoute: request.route.path,
          errorStackTrace: (exception as any).stack,
        },
        {
          headers: {
            ['api-key']: process.env.SLACK_SERVICE_API_KEY,
          },
        }
      );
    }

    response.status(status).json({ statusCode: status, message, error: code });
  }
}
