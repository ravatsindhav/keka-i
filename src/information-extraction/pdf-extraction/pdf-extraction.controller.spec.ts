import { Test, TestingModule } from '@nestjs/testing';
import { PdfExtractionController } from './pdf-extraction.controller';

describe('PdfExtractionController', () => {
  let controller: PdfExtractionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PdfExtractionController],
    }).compile();

    controller = module.get<PdfExtractionController>(PdfExtractionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
