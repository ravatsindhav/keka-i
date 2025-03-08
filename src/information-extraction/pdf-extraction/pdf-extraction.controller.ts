import { Controller, Post, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PdfExtractionService } from './pdf-extraction.service';
import { diskStorage } from 'multer';
import { extname } from 'path';

import { Multer } from 'multer';

@Controller('pdf')
export class PdfExtractionController {
  constructor(private readonly pdfExtractionService: PdfExtractionService) {}

  @Post('extract-data')
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
        return cb(new BadRequestException('Only PDF files are allowed'), false);
      }
      cb(null, true);
    }
  }))
  async extractData(@UploadedFile() file: Multer.File) { 
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Extract text from PDF
    const extractedText = await this.pdfExtractionService.extractTextFromPdf(file.path);
    
    // Extract images from PDF & process them
    const extractedImages = await this.pdfExtractionService.extractImagesFromPdf(file.path);
    const imageAnalysisResults = await Promise.all(
      extractedImages.map(async (imagePath) => ({
        imagePath,
        text: await this.pdfExtractionService.extractTextFromImage(imagePath),
        aiAnalysis: await this.pdfExtractionService.analyzeImageWithAI(imagePath),
      }))
    );

    // Combine extracted data
    const fullText = extractedText + ' ' + imageAnalysisResults.map(res => res.text).join(' ');
    
    // Generate embeddings & store
    await this.pdfExtractionService.generateAndStoreEmbeddings(fullText, file.filename);

    return { extractedText, imageAnalysisResults, message: 'PDF processed successfully' };
  }
}
