import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import open from 'open';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port: number = configService.get<number>('port') as number;
  const server: any = configService.get<string>('server') as any;

  const config = new DocumentBuilder()
    .setTitle('Keka I')
    .setDescription(`The KEKA I Web API's`)
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(port, server);

  const url = await app.getUrl();
  const swaggerUrl = `${url}/api`;

  Logger.log(`~ Application is running on: ${url}`);
  Logger.log(`~ Swagger is available at: ${swaggerUrl}`);

  await open(swaggerUrl);
}
bootstrap();
