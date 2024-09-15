import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import * as cookieParser from 'cookie-parser';

import { CustomExceptionFilter } from '@/common/exceptions';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  const config = new DocumentBuilder()
    .setTitle('Auth api')
    .setDescription('The auth API description')
    .setVersion('1.0')
    .addTag('Auth')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  const port = configService.get<number>('PORT') || 3000;

  SwaggerModule.setup('api', app, document);

  app.enableCors({
    origin: configService.get<string>('CLIENT_URL'),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept',
    credentials: true,
  });
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new CustomExceptionFilter());
  await app.listen(port);
}
bootstrap();
