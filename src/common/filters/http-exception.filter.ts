import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ErrorResponse } from '../interfaces/response.interface.js';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as Record<string, unknown>).message as string ||
          exception.message;

    const errorResponse: ErrorResponse = {
      success: false,
      message: Array.isArray(message) ? message[0] : message,
      error: HttpStatus[status] || 'ERROR',
      statusCode: status,
    };

    response.status(status).json(errorResponse);
  }
}