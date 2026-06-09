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
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);


  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
