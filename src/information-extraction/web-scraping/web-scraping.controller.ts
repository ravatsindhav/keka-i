import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { WebScrapingService } from './web-scraping.service';

@Controller('web-scraping')
export class WebScrapingController {
  constructor(private readonly webScrapingService: WebScrapingService) { }

  // Initialize and start web scraping
  @Post('scrape')
  async scrapeWebsite(@Body() body: { url: string; maxDepth?: number }) {
    if (!body.url) {
      return { success: false, message: 'URL is required' };
    }
    await this.webScrapingService.initialize({
      baseUrl: body.url,
      maxDepth: body.maxDepth,
    });
    return this.webScrapingService.scrapeWebsite(body.url);
  }

  // Query the Pinecone index
  @Get('query')
  async queryIndex(
    @Query('q') query: string,
    @Query('topK') topK?: number,
  ) {
    if (!query) {
      return { success: false, message: 'Query text is required' };
    }
    const results = await this.webScrapingService.query(query, topK || 5);
    return { success: true, results };
  }
}
