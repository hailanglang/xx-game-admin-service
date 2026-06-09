import { TransformInterceptor } from './transform.interceptor.js';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<unknown>;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  it('should wrap response with success:true', (done) => {
    const mockContext = {} as ExecutionContext;
    const mockCallHandler: CallHandler = {
      handle: () => of({ id: 1, name: 'test' }),
    };

    interceptor.intercept(mockContext, mockCallHandler).subscribe((res) => {
      expect(res).toEqual({
        success: true,
        data: { id: 1, name: 'test' },
      });
      done();
    });
  });

  it('should wrap null response', (done) => {
    const mockContext = {} as ExecutionContext;
    const mockCallHandler: CallHandler = {
      handle: () => of(null),
    };

    interceptor.intercept(mockContext, mockCallHandler).subscribe((res) => {
      expect(res).toEqual({
        success: true,
        data: null,
      });
      done();
    });
  });
});