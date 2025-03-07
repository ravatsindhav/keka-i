import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PdfExtractionModule } from './information-extraction/pdf-extraction/pdf-extraction.module';
import { UserQueryModule } from './user-query/user-query.module';
import configuration from './config';
import { WebScrapingModule } from './information-extraction/web-scraping/web-scraping.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    PdfExtractionModule,
    UserQueryModule,
    WebScrapingModule,
  ],
})
export class AppModule { }
