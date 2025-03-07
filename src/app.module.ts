import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PdfExtractionModule } from './pdf-extraction/pdf-extraction.module';
import { UserQueryController } from './user-query/user-query.controller';
import { UserQueryService } from './user-query/user-query.service';
import { UserQueryModule } from './user-query/user-query.module';
import configuration from './config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    PdfExtractionModule,
    UserQueryModule,
  ],
})
export class AppModule {}
