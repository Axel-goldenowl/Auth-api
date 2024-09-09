import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ErrorCode } from '@/common/enums';
import { exceptionCase } from '@/common/exceptions';

@Catch()
export class CustomExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let responseData = {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      errorCode: ErrorCode.SERVER_ERROR,
    };

    if (exception instanceof HttpException) {
      responseData.status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      responseData.message =
        typeof exceptionResponse === 'object'
          ? (exceptionResponse as any).message || exception.message
          : exceptionResponse;
    }

    if (exception instanceof Error) {
      const exceptionDetails = exceptionCase[exception.message];
      if (exceptionDetails) {
        responseData = { ...exceptionDetails };
      } else {
        responseData.message = exception.message;
      }
    }

    response.status(responseData.status).json(responseData);
  }
}
