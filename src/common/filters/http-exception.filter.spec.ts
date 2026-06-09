import { HttpExceptionFilter } from './http-exception.filter.js';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common';
import { jest } from '@jest/globals';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: any;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
      }),
    } as any;
  });

  it('should format 403 Forbidden response correctly', () => {
    const exception = new HttpException('权限不足', HttpStatus.FORBIDDEN);
    filter.catch(exception, mockHost);
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: '权限不足',
      error: 'FORBIDDEN',
      statusCode: 403,
    });
  });

  it('should format 401 Unauthorized response correctly', () => {
    const exception = new HttpException('未登录', HttpStatus.UNAUTHORIZED);
    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: '未登录',
      error: 'UNAUTHORIZED',
      statusCode: 401,
    });
  });
});