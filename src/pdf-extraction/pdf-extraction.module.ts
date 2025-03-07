import { Module } from '@nestjs/common';
import { PdfExtractionService } from './pdf-extraction.service';
import { PdfExtractionController } from './pdf-extraction.controller';

@Module({
  controllers: [PdfExtractionController],
  providers: [PdfExtractionService],
})
export class PdfExtractionModule {}
