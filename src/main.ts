import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin:true,
    credential: true
  })
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 裁切非 DTO 属性
      forbidNonWhitelisted: true, // 存在非 DTO 属性则告警
      transform: true, // 自动将req 的对象转为 DTO
      transformOptions:{
        enableImplicitConversion: true // 从显示转换到隐式转换
      }
    })
  )
  app.useGlobalInterceptors(new TransformInterceptor()); // response 规范化
  app.useGlobalFilters(new HttpExceptionFilter()); // 未捕获的异常浪街
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
