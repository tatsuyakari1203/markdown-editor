import { ReformatResponse, RewriteResponse, TextChunk, ChunkContext } from './gemini/types';
import { SmartChunker } from './gemini/SmartChunker';
import { TokenOptimizer } from './gemini/TokenOptimizer';
import { PromptBuilder } from './PromptBuilder';
import { DocumentAnalyzer } from './DocumentAnalyzer';
import { GoogleGenAI } from '@google/genai';

export class ContentProcessor {
  private genAI: GoogleGenAI;
  private modelName: string;
  private chunker: SmartChunker;
  private tokenOptimizer: TokenOptimizer;
  private promptBuilder: PromptBuilder;
  private documentAnalyzer: DocumentAnalyzer;

  constructor(
    genAI: GoogleGenAI,
    modelName: string,
    chunker: SmartChunker,
    tokenOptimizer: TokenOptimizer,
    promptBuilder: PromptBuilder,
    documentAnalyzer: DocumentAnalyzer
  ) {
    this.genAI = genAI;
    this.modelName = modelName;
    this.chunker = chunker;
    this.tokenOptimizer = tokenOptimizer;
    this.promptBuilder = promptBuilder;
    this.documentAnalyzer = documentAnalyzer;
  }

  async reformatMarkdown(
    content: string,
    onProgress?: (progress: { current: number; total: number; status: string }) => void
  ): Promise<ReformatResponse> {
    try {
      console.log('🔄 Starting markdown reformat...');
      
      // Analyze content structure for intelligent chunking decision
      const contentAnalysis = this.tokenOptimizer.analyzeContentComplexity(content);
      const estimatedTokens = this.tokenOptimizer.estimateTokens(content);
      
      // Smart chunking decision based on content structure
      const needsChunking = this.shouldUseChunking(content, estimatedTokens, contentAnalysis);
      
      if (!needsChunking) {
        // Process as single chunk
        onProgress?.({ current: 1, total: 1, status: 'Đang xử lý văn bản...' });
        return await this.reformatSingleChunk(content);
      }
      
      // Process with chunking strategy
      console.log('📄 Large content detected, using chunking strategy...');
      onProgress?.({ current: 0, total: 0, status: 'Đang phân tích và tách văn bản...' });
      
      const optimalChunkSize = this.tokenOptimizer.optimizeChunkSize(content);
      const chunks = this.chunker.chunkText(content, { 
        maxChunkSize: optimalChunkSize,
        maxOutputTokens: this.tokenOptimizer.getOptimalOutputTokenLimit(optimalChunkSize)
      });
      
      console.log(`📊 Split into ${chunks.length} chunks for processing`);
      
      const reformattedChunks: string[] = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkContext = this.chunker.buildChunkContext(chunk, content);
        
        onProgress?.({
          current: i + 1,
          total: chunks.length,
          status: `Đang xử lý đoạn ${i + 1}/${chunks.length}...`
        });
        
        console.log(`🔄 Processing chunk ${i + 1}/${chunks.length} (${chunk.type})`);
        
        const chunkResult = await this.reformatChunkWithContext(chunk, chunkContext);
        
        if (!chunkResult.success) {
          console.error(`❌ Failed to process chunk ${i + 1}:`, chunkResult.error);
          return {
            success: false,
            content: '',
            error: `Failed to process chunk ${i + 1}: ${chunkResult.error}`,
            chunksProcessed: i,
            totalChunks: chunks.length
          };
        }
        
        reformattedChunks.push(chunkResult.content);
      }
      
      // Merge chunks with intelligent deduplication
      onProgress?.({ current: chunks.length, total: chunks.length, status: 'Đang hợp nhất kết quả...' });
      const mergedContent = this.mergeChunks(reformattedChunks, chunks);
      
      console.log('✅ Chunked reformat completed successfully');
      
      return {
        success: true,
        content: mergedContent,
        chunksProcessed: chunks.length,
        totalChunks: chunks.length
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown reformat error';
      console.error('❌ Reformat failed:', errorMessage);
      return {
        success: false,
        content: '',
        error: errorMessage
      };
    }
  }

  async rewriteContent(
    content: string,
    prompt: string,
    context?: { beforeText?: string; afterText?: string; documentStructure?: string; fullDocument?: string }
  ): Promise<RewriteResponse> {
    try {
      console.log('🔄 Starting content rewrite with instructions:', prompt);
      
      // Enhanced context analysis with full document awareness
      const enhancedContext = this.buildEnhancedRewriteContext(content, prompt, context);
      
      // Use chunking strategy for large content while preserving context
      if (enhancedContext.shouldUseChunking) {
        return await this.rewriteWithChunking(content, prompt, enhancedContext);
      }
      
      const fullPrompt = this.promptBuilder.buildOptimizedRewritePrompt(
        content,
        prompt,
        enhancedContext.documentAnalysis,
        enhancedContext.contentComplexity,
        enhancedContext.semanticContext,
        enhancedContext.contextWindow,
        enhancedContext.fullDocument,
        enhancedContext.beforeText,
        enhancedContext.afterText
      );

      const response = await this.genAI.models.generateContent({
        model: this.modelName,
        contents: fullPrompt,
        config: {
          temperature: enhancedContext.optimalTemperature,
          topK: enhancedContext.optimalTopK,
          topP: enhancedContext.optimalTopP,
          maxOutputTokens: enhancedContext.optimalOutputTokens,
        }
      });

      const rewrittenContent = response.text.trim();
      const cleanContent = this.cleanResponseContent(rewrittenContent);

      console.log('✅ Content rewrite completed successfully');
      return {
        success: true,
        content: cleanContent
      };
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to rewrite content';
      console.error('❌ Rewrite failed:', errorMessage);
      console.error('Full error:', error);
      return {
        success: false,
        content: '',
        error: errorMessage
      };
    }
  }

  private async reformatSingleChunk(content: string): Promise<ReformatResponse> {
    try {
      const prompt = this.promptBuilder.buildReformatPrompt(content);
      
      const response = await this.genAI.models.generateContent({
          model: this.modelName,
          contents: prompt,
          config: {
            temperature: 0.1,
            topK: 1,
            topP: 0.8,
            maxOutputTokens: 32768,
          }
        });

      const reformattedContent = response.text.trim();

      // Remove markdown code block wrapper if present
      const cleanContent = reformattedContent
        .replace(/^```markdown\s*\n/, '')
        .replace(/\n```$/, '')
        .replace(/^```\s*\n/, '')
        .replace(/\n```$/, '');

      console.log('✅ Markdown reformat completed successfully');
      return {
        success: true,
        content: cleanContent
      };
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to reformat content';
      console.error('❌ Reformat failed:', errorMessage);
      console.error('Full error:', error);
      return {
        success: false,
        content: '',
        error: errorMessage
      };
    }
  }

  private async reformatChunkWithContext(chunk: TextChunk, context: ChunkContext): Promise<ReformatResponse> {
    try {
      const prompt = this.promptBuilder.buildReformatPrompt(chunk.content, context);
      
      const response = await this.genAI.models.generateContent({
          model: this.modelName,
          contents: prompt,
          config: {
            temperature: 0.1,
            topK: 1,
            topP: 0.8,
            maxOutputTokens: context.currentPosition === 0 ? 32768 : 24576,
          }
        });

      const reformattedContent = response.text.trim();

      // Remove markdown code block wrapper if present
      const cleanContent = reformattedContent
        .replace(/^```markdown\s*\n/, '')
        .replace(/\n```$/, '')
        .replace(/^```\s*\n/, '')
        .replace(/\n```$/, '');

      return {
        success: true,
        content: cleanContent
      };
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to reformat chunk';
      console.error('❌ Chunk reformat failed:', errorMessage);
      return {
        success: false,
        content: '',
        error: errorMessage
      };
    }
  }

  private async rewriteWithChunking(content: string, prompt: string, enhancedContext: any): Promise<RewriteResponse> {
    try {
      console.log('📄 Large content detected, using chunking strategy for rewrite...');
      
      const optimalChunkSize = this.tokenOptimizer.optimizeChunkSize(content);
      const chunks = this.chunker.chunkText(content, { 
        maxChunkSize: optimalChunkSize,
        maxOutputTokens: this.tokenOptimizer.getOptimalOutputTokenLimit(optimalChunkSize)
      });
      
      console.log(`📊 Split into ${chunks.length} chunks for rewriting`);
      
      const rewrittenChunks: string[] = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkContext = this.chunker.buildChunkContext(chunk, content);
        
        console.log(`🔄 Rewriting chunk ${i + 1}/${chunks.length} (${chunk.type})`);
        
        const chunkPrompt = this.promptBuilder.buildChunkRewritePrompt(
          chunk,
          prompt,
          chunkContext,
          enhancedContext,
          i,
          chunks.length
        );
        
        const response = await this.genAI.models.generateContent({
          model: this.modelName,
          contents: chunkPrompt,
          config: {
            temperature: enhancedContext.optimalTemperature,
            topK: enhancedContext.optimalTopK,
            topP: enhancedContext.optimalTopP,
            maxOutputTokens: Math.min(32768, enhancedContext.optimalOutputTokens),
          }
        });
        
        const chunkResult = response.text.trim();
        const cleanChunkContent = this.cleanResponseContent(chunkResult);
        
        rewrittenChunks.push(cleanChunkContent);
      }
      
      // Merge chunks with intelligent deduplication
      const mergedContent = this.mergeRewrittenChunks(rewrittenChunks, chunks, enhancedContext);
      
      console.log('✅ Chunked rewrite completed successfully');
      
      return {
        success: true,
        content: mergedContent,
        chunksProcessed: chunks.length,
        totalChunks: chunks.length
      };
      
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to rewrite with chunking';
      console.error('❌ Chunked rewrite failed:', errorMessage);
      return {
        success: false,
        content: '',
        error: errorMessage
      };
    }
  }

  private buildEnhancedRewriteContext(content: string, prompt: string, context?: { beforeText?: string; afterText?: string; documentStructure?: string; fullDocument?: string }) {
    const beforeText = context?.beforeText || '';
    const afterText = context?.afterText || '';
    const documentStructure = context?.documentStructure || '';
    const fullDocument = context?.fullDocument || (beforeText + content + afterText);
    
    // Advanced document analysis
    const documentAnalysis = this.documentAnalyzer.performDeepDocumentAnalysis(fullDocument, content);
    const contentComplexity = this.tokenOptimizer.analyzeContentComplexity(content);
    const estimatedTokens = this.tokenOptimizer.estimateTokens(content + prompt + beforeText + afterText);
    
    // Determine optimal processing strategy
    const shouldUseChunking = estimatedTokens > 800000 || content.length > 50000;
    const contextWindow = this.documentAnalyzer.calculateOptimalContextWindow(content, beforeText, afterText);
    
    // Extract semantic relationships
    const semanticContext = this.documentAnalyzer.extractSemanticContext(content, fullDocument);
    
    // Optimize generation parameters based on content type
    const generationParams = this.promptBuilder.optimizeGenerationParameters(documentAnalysis, contentComplexity, prompt);
    
    return {
      documentAnalysis,
      contentComplexity,
      semanticContext,
      contextWindow,
      shouldUseChunking,
      estimatedTokens,
      ...generationParams,
      fullDocument,
      beforeText,
      afterText,
      documentStructure
    };
  }

  private shouldUseChunking(content: string, estimatedTokens: number, contentAnalysis: any): boolean {
    // Base thresholds
    const baseCharLimit = 40000;
    const baseTokenLimit = 600000;
    
    // Adjust thresholds based on content complexity
    const complexityMultiplier = 1 + (contentAnalysis.codeBlockRatio + contentAnalysis.mathContentRatio) * 0.5;
    const adjustedCharLimit = baseCharLimit / complexityMultiplier;
    const adjustedTokenLimit = baseTokenLimit / complexityMultiplier;
    
    return content.length > adjustedCharLimit || estimatedTokens > adjustedTokenLimit;
  }

  private mergeChunks(reformattedChunks: string[], originalChunks: TextChunk[]): string {
    if (reformattedChunks.length === 1) return reformattedChunks[0];
    
    let merged = reformattedChunks[0];
    
    for (let i = 1; i < reformattedChunks.length; i++) {
      const currentChunk = reformattedChunks[i];
      const cleanedChunk = this.removeOverlap(currentChunk, merged);
      
      // Ensure proper spacing based on chunk type
      const needsSpacing = !merged.endsWith('\n\n') && !cleanedChunk.startsWith('\n');
      const spacing = needsSpacing ? '\n\n' : '';
      
      merged += spacing + cleanedChunk;
    }
    
    return merged.trim();
  }

  private mergeRewrittenChunks(chunks: string[], originalChunks: TextChunk[], context: any): string {
    if (chunks.length === 1) return chunks[0];
    
    let merged = chunks[0];
    
    for (let i = 1; i < chunks.length; i++) {
      const currentChunk = chunks[i];
      const cleanedChunk = this.removeChunkOverlap(currentChunk, merged);
      
      // Ensure proper spacing
      const needsSpacing = !merged.endsWith('\n\n') && !cleanedChunk.startsWith('\n');
      merged += (needsSpacing ? '\n\n' : '') + cleanedChunk;
    }
    
    return merged.trim();
  }

  private removeOverlap(currentChunk: string, previousContent: string): string {
    const currentLines = currentChunk.split('\n');
    const previousLines = previousContent.split('\n');
    
    // Find overlap by comparing last few lines of previous with first few lines of current
    let overlapLines = 0;
    const maxCheck = Math.min(3, currentLines.length, previousLines.length);
    
    for (let i = 1; i <= maxCheck; i++) {
      const prevLine = previousLines[previousLines.length - i]?.trim();
      const currLine = currentLines[i - 1]?.trim();
      
      if (prevLine && currLine && prevLine === currLine) {
        overlapLines = i;
      } else {
        break;
      }
    }
    
    return currentLines.slice(overlapLines).join('\n');
  }

  private removeChunkOverlap(currentChunk: string, previousContent: string): string {
    const currentLines = currentChunk.split('\n');
    const previousLines = previousContent.split('\n');
    
    // Find overlap
    let overlapLines = 0;
    const maxCheck = Math.min(5, currentLines.length, previousLines.length);
    
    for (let i = 1; i <= maxCheck; i++) {
      const prevLine = previousLines[previousLines.length - i]?.trim();
      const currLine = currentLines[i - 1]?.trim();
      
      if (prevLine && currLine && prevLine === currLine) {
        overlapLines = i;
      } else {
        break;
      }
    }
    
    return currentLines.slice(overlapLines).join('\n');
  }

  private cleanResponseContent(content: string): string {
    return content
      .replace(/^```markdown\s*\n/, '')
      .replace(/\n```$/, '')
      .replace(/^```\s*\n/, '')
      .replace(/\n```$/, '')
      .trim();
  }
}