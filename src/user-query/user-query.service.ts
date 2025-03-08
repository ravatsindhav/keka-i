import { BadRequestException, Injectable } from '@nestjs/common';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

@Injectable()
export class UserQueryService {
  private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  private pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });

  async queryPinecone(query: string) {
    try {
      // Generate embedding for the user query
      const embeddingResponse = await this.openai.embeddings.create({
        model: 'text-embedding-3-large',
        input: query,
      });

      const queryEmbedding = embeddingResponse.data[0].embedding; // Extract query vector

      // Search Pinecone for similar embeddings
      const index = this.pinecone.index(process.env.PINECONE_INDEX);
      const searchResponse = await index.query({
        vector: queryEmbedding, // Query using the vector
        topK: 3, // Get top 3 most relevant results
        includeMetadata: true, // Include stored metadata
      });

      return searchResponse.matches
        .sort((a, b) => b.score - a.score)
        .map(match => ({
          id: match.id,
          score: match.score, // Similarity score
          metadata: match.metadata, // Any extra data stored
          temperature: 0.2
        }));

    } catch (error) {
      throw new BadRequestException('Error querying embeddings');
    }
  }

  async generateResponse(query: string) {
    // Step 1: Get relevant embeddings from Pinecone
    const relevantDocs = await this.queryPinecone(query);

    // Step 2: Extract relevant text (if stored in metadata)
    const context = relevantDocs.map(doc => doc.metadata?.text).join('\n');

    // Step 3: Send context + query to OpenAI's GPT
    const chatResponse = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are Keka Intelligence, an AI for Keka that provides information based on stored embeddings.' },
        { role: 'user', content: `Context:\n${context}\n\nQuery: ${query}` },
      ],
    });

    return chatResponse.choices[0].message.content; // Return AI response
  }


}
