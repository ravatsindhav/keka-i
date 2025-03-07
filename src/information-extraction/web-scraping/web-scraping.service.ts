import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from 'langchain/document';
import { Pinecone } from '@pinecone-database/pinecone';

@Injectable()
export class WebScrapingService {
  private readonly logger = new Logger(WebScrapingService.name);
  private visitedUrls: Set<string> = new Set();
  private maxDepth: number = 3;
  private baseUrl: string = '';
  private concurrencyLimit: number = 5;
  private activeRequests: number = 0;
  private pinecone: Pinecone;
  private indexName: string = 'model-embeddings';

  constructor() {
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

  }

  async initialize(options: { baseUrl: string; maxDepth?: number }) {
    this.baseUrl = options.baseUrl;
    this.maxDepth = options.maxDepth || 3;
    this.logger.log(`Initialized scraper with base URL: ${this.baseUrl}`);
    await this.ensurePineconeIndex();
    return this;
  }

  private async ensurePineconeIndex() {
    const indexes = await this.pinecone.listIndexes();
    if (!indexes.indexes.some(index => index.name === this.indexName)) {
      this.logger.log(`No Pinecone index with name ${this.indexName} found, create one to proceed.`);
    }
  }

  async scrapeWebsite(seedUrl: string) {
    this.visitedUrls.clear();
    const documents: Document[] = [];
    this.logger.log(`Starting scrape from: ${seedUrl}`);
    await this.crawlPage(seedUrl, 0, documents);
    await this.indexDocuments(documents);
    return { success: true, message: `Scraped and indexed ${documents.length} documents.` };
  }

  private async crawlPage(url: string, depth: number, documents: Document[]) {
    if (depth > this.maxDepth || this.visitedUrls.has(url)) return;
    while (this.activeRequests >= this.concurrencyLimit) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    this.activeRequests++;
    this.visitedUrls.add(url);
    try {
      this.logger.debug(`Crawling ${url} at depth ${depth}`);
      const { data } = await axios.get(url);
      const $ = cheerio.load(data);
      const content = this.extractContent($);
      const chunks = await this.chunkContent(content, url);
      documents.push(...chunks);
      const links = this.extractLinks($, url);
      for (const link of links) {
        await this.crawlPage(link, depth + 1, documents);
      }
    } catch (error) {
      this.logger.error(`Error crawling ${url}: ${error.message}`);
    }
    this.activeRequests--;
  }

  private extractContent($: cheerio.CheerioAPI): string {
    $('script, style, nav, footer, header, aside').remove();
    return $('main, article, body').text().trim();
  }

  private async chunkContent(content: string, url: string): Promise<Document[]> {
    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 2000, chunkOverlap: 300 });
    const chunks = await splitter.splitText(content);
    return chunks.map(chunk => new Document({
      pageContent: chunk,
      metadata: { id: uuidv4(), source: url },
    }));
  }

  private extractLinks($: cheerio.CheerioAPI, currentUrl: string): string[] {
    const links = new Set<string>();
    $('a').each((_, el) => {
      let href = $(el).attr('href');
      if (!href) return;
      if (!href.startsWith('http')) {
        href = new URL(href, currentUrl).href;
      }
      if (new URL(href).hostname === new URL(this.baseUrl).hostname) {
        links.add(href);
      }
    });
    return Array.from(links);
  }

  private async indexDocuments(documents: Document[]) {
    try {
      const embeddings = new OpenAIEmbeddings({ modelName: 'text-embedding-3-large' });

      for (const doc of documents) {
        if (Buffer.byteLength(doc.pageContent, 'utf8') > 4194304) {  // 4MB limit
          this.logger.warn(`Skipping large document (${doc.metadata.source}) - too big for OpenAI.`);
          continue;
        }

        const vector = {
          id: doc.metadata.id,
          values: await embeddings.embedQuery(doc.pageContent),
          metadata: doc.metadata,
        };

        const pineconeIndex = this.pinecone.Index(this.indexName);
        await pineconeIndex.upsert([vector]);
      }

      this.logger.log(`Indexed ${documents.length} documents.`);
    } catch (error) {
      this.logger.error(`Indexing error: ${error.message}`);
    }
  }


  async query(query: string, topK: number = 5) {
    try {
      const embeddings = new OpenAIEmbeddings({ modelName: 'text-embedding-3-large' });
      const vector = await embeddings.embedQuery(query);
      const pineconeIndex = this.pinecone.Index(this.indexName);
      const results = await pineconeIndex.query({ vector, topK, includeMetadata: true });
      return results.matches.map(match => ({
        score: match.score,
        text: match.metadata.pageContent,
        source: match.metadata.source,
      }));
    } catch (error) {
      this.logger.error(`Query error: ${error.message}`);
      return [];
    }
  }
}
