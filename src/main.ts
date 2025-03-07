import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port: number = configService.get<number>('port') as number;
  const server: any = configService.get<number>('server') as any;

  const config = new DocumentBuilder()
    .setTitle('Keka I')
    .setDescription(`The KEKA I Web API's`)
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);


  await app.listen(port, server);
  Logger.log(`~ Application is running on: ${await app.getUrl()}`);
}
bootstrap();
