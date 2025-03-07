import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PdfExtractionService } from './pdf-extraction.service';
import { diskStorage } from 'multer';
import { extname } from 'path';

import { Multer } from 'multer';

@Controller('pdf')
export class PdfExtractionController {
  constructor(private readonly pdfExtractionService: PdfExtractionService) {}

  @Post('extract-text')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + extname(file.originalname));
      }
    }),
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.includes('pdf')) {
        return cb(new Error('Only PDF files are allowed'), false);
      }
      cb(null, true);
    }
  }))
  async extractText(@UploadedFile() file: Multer.File) { 
    if (!file) {
      return { message: 'No file uploaded' };
    }

    const text = await this.pdfExtractionService.extractTextFromPdf(file.path);
    return { extractedText: text };
  }
}
