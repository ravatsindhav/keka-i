import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as pdfParse from 'pdf-parse';
import * as Tesseract from 'tesseract.js';
import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { PDFDocument, PDFName, PDFDict, PDFRef } from 'pdf-lib';

@Injectable()
export class PdfExtractionService {
  private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  private pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });

  //  Extract text from PDF
  async extractTextFromPdf(filePath: string): Promise<string> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } catch (error) {
      Logger.log('Error extracting text from PDF', error);
      throw new BadRequestException(error, 'Error extracting text from PDF');
    }
  }

  // Extract images from PDF
  async extractImagesFromPdf(filePath: string): Promise<string[]> {
    try {
      const pdfData = fs.readFileSync(filePath);
      const pdfDoc = await PDFDocument.load(pdfData);
      const extractedImages: string[] = [];

      for (let pageIndex = 0; pageIndex < pdfDoc.getPageCount(); pageIndex++) {
        const page = pdfDoc.getPage(pageIndex);
        const resources = page.node.Resources();
        if (!resources) continue;

        const xObjectsObj = resources.get(PDFName.of('XObject'));
        if (!xObjectsObj) continue;

        // Make sure we have a dictionary
        if (!(xObjectsObj instanceof PDFDict)) continue;

        const xObjects = xObjectsObj as PDFDict;
        const xObjectKeys = xObjects.keys();

        for (const key of xObjectKeys) {
          const xObjectRef = xObjects.get(key);
          if (!xObjectRef) continue;

          // We need to handle both direct objects and references
          let xObject;
          if (xObjectRef instanceof PDFRef) {
            xObject = pdfDoc.context.lookup(xObjectRef);
          } else {
            xObject = xObjectRef;
          }

          // Check if it's an image by looking at the Subtype
          if (xObject instanceof PDFDict) {
            const subtype = xObject.get(PDFName.of('Subtype'));
            const isImage = subtype && subtype.toString() === '/Image';

            if (isImage) {
              try {
                // Create a new PDF document containing just this page
                const newPdf = await PDFDocument.create();
                // Embed the page but don't need to store the reference
                await newPdf.embedPages([page]);

                // Convert to PNG format
                const pngBytes = await newPdf.saveAsBase64({ dataUri: true });

                // Extract just the base64 part without the data URI prefix
                const base64Parts = pngBytes.split(',');
                if (base64Parts.length > 1) {
                  const base64Data = base64Parts[1];
                  extractedImages.push(`data:image/png;base64,${base64Data}`);
                }
              } catch (err) {
                Logger.log('Could not extract image:', err);
                // Continue with other images even if one fails
              }
            }
          }
        }
      }

      return extractedImages;
    } catch (error) {
      Logger.log('Error extracting images:', error);
      throw new BadRequestException('Error extracting images from PDF');
    }
  }

  // 🔹 Extract text from images (OCR)
  async extractTextFromImage(imagePath: string): Promise<string> {
    try {
      const { data } = await Tesseract.recognize(imagePath, 'eng');
      return data.text;
    } catch (error) {
      Logger.log('Error extracting text from image:', error);
      throw new BadRequestException('Error extracting text from image');
    }
  }

  // 🔹 Analyze image content with AI
  async analyzeImageWithAI(imagePath: string): Promise<string> {
    try {
      // For data URIs, we need to handle them differently than file paths
      let base64Image: string;

      if (imagePath.startsWith('data:image')) {
        // Extract the base64 part from the data URI
        base64Image = imagePath.split(',')[1];
      } else {
        // Read the file as base64 if it's a file path
        const imageBuffer = fs.readFileSync(imagePath);
        base64Image = imageBuffer.toString('base64');
      }

      // Call OpenAI Vision API to analyze the image
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "What's in this image? Please describe all visible content including any text." },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 300,
      });

      return response.choices[0].message.content || "No analysis available";
    } catch (error) {
      console.error('Error analyzing image with AI:', error);
      throw new BadRequestException('Error analyzing image with AI');
    }
  }

  // 🔹 Generate embeddings and store in Pinecone
  async generateAndStoreEmbeddings(text: string, id: string) {
    try {
      const embeddingResponse = await this.openai.embeddings.create({
        model: 'text-embedding-3-large',
        input: text,
      });

      const embedding = embeddingResponse.data[0].embedding;

      const index = this.pinecone.index(process.env.PINECONE_INDEX, process.env.PINECONE_INDEX_HOST);

      const vector = {
        id: id,
        values: embedding, // Ensure embeddings are stored
        metadata: {
          source: id,
          text: text,
        },
      };

      await index.upsert([vector]);

      return 'Embedding stored successfully!';
    } catch (error) {
      Logger.log('Error generating or storing embeddings:', error);
      throw new BadRequestException(error, 'Error generating or storing embeddings');
    }
  }
}