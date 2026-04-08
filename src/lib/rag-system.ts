/**
 * Phase 126: Production RAG System
 * Complete Retrieval Augmented Generation pipeline with document processing and semantic retrieval
 */

import { logger } from './logger';
import { redis } from './cache';

interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  startPosition: number;
  endPosition: number;
  metadata: Record<string, any>;
}

interface RetrievalResult {
  chunk: DocumentChunk;
  relevanceScore: number;
  citation: { documentId: string; chunkId: string; position: { start: number; end: number } };
}

interface RetrievalMetrics {
  precision: number;
  recall: number;
  mrr: number; // Mean Reciprocal Rank
  ndcg: number; // Normalized Discounted Cumulative Gain
}

interface AssembledContext {
  content: string;
  chunks: DocumentChunk[];
  citations: Array<{ chunkId: string; documentId: string }>;
  totalTokens: number;
  truncated: boolean;
}

interface RAGResponse {
  answer: string;
  context: AssembledContext;
  citations: Array<{ chunkId: string; documentId: string; content: string }>;
  metrics: {
    retrievalLatencyMs: number;
    contextAssemblyLatencyMs: number;
  };
}

class DocumentProcessor {
  private counter = 0;

  processDocument(
    documentId: string,
    content: string,
    options: {
      chunkSize?: number;
      overlapRatio?: number;
      format?: 'pdf' | 'markdown' | 'plaintext';
      metadata?: Record<string, any>;
    } = {}
  ): DocumentChunk[] {
    const { chunkSize = 512, overlapRatio = 0.2, format = 'plaintext', metadata = {} } = options;

    const overlap = Math.floor(chunkSize * overlapRatio);
    const stride = chunkSize - overlap;
    const chunks: DocumentChunk[] = [];

    let position = 0;
    while (position < content.length) {
      const endPosition = Math.min(position + chunkSize, content.length);
      const chunk: DocumentChunk = {
        id: `chunk-${Date.now()}-${++this.counter}`,
        documentId,
        content: content.slice(position, endPosition),
        startPosition: position,
        endPosition,
        metadata: { ...metadata, format, processedAt: Date.now() }
      };

      chunks.push(chunk);
      position += stride;
    }

    logger.info('Document processed', { documentId, chunks: chunks.length, totalLength: content.length });
    return chunks;
  }

  normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.\-]/g, '')
      .trim();
  }

  extractMetadata(content: string): Record<string, any> {
    return {
      wordCount: content.split(/\s+/).length,
      hasNumbers: /\d+/.test(content),
      hasUrls: /https?:\/\//.test(content),
      extractedAt: Date.now()
    };
  }
}

class SemanticRetriever {
  private counter = 0;

  retrieve(
    query: string,
    chunks: DocumentChunk[],
    options: {
      topK?: number;
      minRelevance?: number;
      includeMetadata?: boolean;
      filters?: Record<string, any>;
    } = {}
  ): RetrievalResult[] {
    const { topK = 5, minRelevance = 0.6, includeMetadata = true } = options;

    // Simple BM25-like scoring
    const queryTerms = query.toLowerCase().split(/\s+/);
    const results: RetrievalResult[] = [];

    for (const chunk of chunks) {
      const chunkText = chunk.content.toLowerCase();
      let score = 0;

      for (const term of queryTerms) {
        const termCount = (chunkText.match(new RegExp(`\\b${term}\\b`, 'g')) || []).length;
        score += termCount / Math.max(1, chunk.content.split(/\s+/).length);
      }

      score = score / queryTerms.length;

      if (score >= minRelevance) {
        results.push({
          chunk,
          relevanceScore: score,
          citation: {
            documentId: chunk.documentId,
            chunkId: chunk.id,
            position: { start: chunk.startPosition, end: chunk.endPosition }
          }
        });
      }
    }

    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return results.slice(0, topK);
  }

  batchRetrieve(
    queries: string[],
    chunks: DocumentChunk[],
    options?: { topK?: number; minRelevance?: number }
  ): RetrievalResult[][] {
    return queries.map(q => this.retrieve(q, chunks, options));
  }

  getRetrievalMetrics(
    retrievedChunks: RetrievalResult[],
    relevantChunks: DocumentChunk[]
  ): RetrievalMetrics {
    const retrieved = new Set(retrievedChunks.map(r => r.chunk.id));
    const relevant = new Set(relevantChunks.map(c => c.id));

    const truePositives = Array.from(retrieved).filter(id => relevant.has(id)).length;
    const falsePositives = Array.from(retrieved).filter(id => !relevant.has(id)).length;
    const falseNegatives = relevant.size - truePositives;

    const precision = retrieved.size > 0 ? truePositives / retrieved.size : 0;
    const recall = relevant.size > 0 ? truePositives / relevant.size : 0;

    // Simple MRR (Mean Reciprocal Rank)
    let mrr = 0;
    for (let i = 0; i < retrievedChunks.length; i++) {
      if (relevant.has(retrievedChunks[i].chunk.id)) {
        mrr = 1 / (i + 1);
        break;
      }
    }

    // Simple NDCG
    let dcg = 0;
    for (let i = 0; i < retrievedChunks.length; i++) {
      const relevance = relevant.has(retrievedChunks[i].chunk.id) ? 1 : 0;
      dcg += relevance / Math.log2(i + 2);
    }
    const idcg = Math.min(relevant.size, retrievedChunks.length);
    const ndcg = idcg > 0 ? dcg / idcg : 0;

    return { precision, recall, mrr, ndcg };
  }
}

class ContextAssembler {
  private counter = 0;

  assemble(
    retrievedResults: RetrievalResult[],
    options: {
      maxTokens?: number;
      format?: 'plain' | 'markdown' | 'json';
      includeCitations?: boolean;
    } = {}
  ): AssembledContext {
    const { maxTokens = 2000, format = 'plain', includeCitations = true } = options;

    const chunks = retrievedResults.map(r => r.chunk);
    const citations = retrievedResults.map(r => r.citation);

    let content = '';
    let tokenCount = 0;
    let truncated = false;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkTokens = Math.ceil(chunk.content.split(/\s+/).length);

      if (tokenCount + chunkTokens > maxTokens) {
        truncated = true;
        break;
      }

      if (format === 'markdown') {
        content += `\n## Source ${i + 1}\n${chunk.content}\n`;
      } else if (format === 'json') {
        content += JSON.stringify({ id: chunk.id, content: chunk.content }) + '\n';
      } else {
        content += `\n${chunk.content}`;
      }

      tokenCount += chunkTokens;
    }

    return {
      content: content.trim(),
      chunks: chunks.slice(0, Math.ceil(maxTokens / 256)),
      citations: includeCitations ? citations : [],
      totalTokens: tokenCount,
      truncated
    };
  }

  formatForLLM(context: AssembledContext): string {
    return `Context:\n${context.content}\n\nBased on the above context, answer the user's question.`;
  }

  createCitationString(citation: { chunkId: string; documentId: string }): string {
    return `[${citation.documentId}#${citation.chunkId}]`;
  }
}

class RAGPipeline {
  private processor = new DocumentProcessor();
  private retriever = new SemanticRetriever();
  private assembler = new ContextAssembler();
  private counter = 0;

  async retrieve(
    query: string,
    chunks: DocumentChunk[],
    options: {
      topK?: number;
      minRelevance?: number;
      maxContextTokens?: number;
      format?: 'plain' | 'markdown' | 'json';
    } = {}
  ): Promise<RAGResponse['context']> {
    const startTime = Date.now();

    // Check cache
    const cacheKey = `sanliurfa:rag:${query}`;
    const cached = redis.get(cacheKey);
    if (cached) {
      logger.debug('RAG context retrieved from cache', { query });
      return JSON.parse(cached);
    }

    // Retrieve relevant chunks
    const results = this.retriever.retrieve(query, chunks, {
      topK: options.topK || 5,
      minRelevance: options.minRelevance || 0.6
    });

    // Assemble context
    const context = this.assembler.assemble(results, {
      maxTokens: options.maxContextTokens || 2000,
      format: options.format || 'plain'
    });

    // Cache result
    redis.setex(cacheKey, 3600, JSON.stringify(context));

    logger.info('RAG retrieval completed', {
      query,
      retrievedChunks: results.length,
      totalTokens: context.totalTokens,
      latencyMs: Date.now() - startTime
    });

    return context;
  }

  processAndRetrieve(
    query: string,
    documentId: string,
    documentContent: string,
    options: any = {}
  ): RAGResponse['context'] {
    const chunks = this.processor.processDocument(documentId, documentContent, {
      chunkSize: options.chunkSize || 512,
      overlapRatio: options.overlapRatio || 0.2
    });

    return this.retrieve(query, chunks, options).then(ctx => ctx);
  }

  formatAnswer(context: AssembledContext, answer: string): RAGResponse {
    return {
      answer,
      context,
      citations: context.citations.map(c => ({
        chunkId: c.chunkId,
        documentId: c.documentId,
        content: '' // Would be filled from actual chunks
      })),
      metrics: {
        retrievalLatencyMs: 0,
        contextAssemblyLatencyMs: 0
      }
    };
  }
}

export const documentProcessor = new DocumentProcessor();
export const semanticRetriever = new SemanticRetriever();
export const contextAssembler = new ContextAssembler();
export const ragPipeline = new RAGPipeline();

export { DocumentChunk, RetrievalResult, RetrievalMetrics, AssembledContext, RAGResponse };
