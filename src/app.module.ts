import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PdfExtractionModule } from './pdf-extraction/pdf-extraction.module';
import configuration from './config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    PdfExtractionModule,
  ],
})
export class AppModule {}
