import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin:true,
    credential: true
  })
  // pipe
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
  app.useGlobalFilters(new HttpExceptionFilter()); // 未捕获的异常拦截

  // swagger
  const config = new DocumentBuilder()
    .setTitle('xxgame-admin-service')
    .setDescription('The admin service API description')
    .setVersion('1.0')
    .addTag('cats aa')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'Authorization',
      description: '输入 JWT token',
      in: 'header',
    })
    .build();
  const documentFactory = () => {
    const document = SwaggerModule.createDocument(app, config);
    // 全局安全要求：所有接口默认需要 bearer token（配合 @Public() 装饰器可跳过）
    document.security = [{ bearer: [] }];
    return document;
  };
  SwaggerModule.setup('api', app, documentFactory);


  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
