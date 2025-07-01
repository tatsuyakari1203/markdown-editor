import { GoogleGenAI } from '@google/genai';

export interface GeminiConfig {
  apiKey: string;
  model?: string;
}

export interface ReformatResponse {
  success: boolean;
  content: string;
  error?: string;
  chunksProcessed?: number;
  totalChunks?: number;
}

export interface RewriteResponse {
  success: boolean;
  content: string;
  error?: string;
}

export interface TextChunk {
  content: string;
  position: number;
  totalChunks: number;
  type: 'heading' | 'paragraph' | 'code' | 'list' | 'table' | 'mixed';
  startLine: number;
  endLine: number;
}

export interface ChunkingConfig {
  maxChunkSize: number;
  overlapSize: number;
  preserveStructure: boolean;
  maxOutputTokens: number;
}

export interface ChunkContext {
  documentStructure: string;
  precedingContent: string;
  followingPreview: string;
  styleGuide: string;
  totalChunks: number;
  currentPosition: number;
}

class GeminiService {
  private genAI: GoogleGenAI | null = null;
  private apiKey: string = '';
  private modelName: string = '';
  private isInitializing: boolean = false;
  private lastError: string | null = null;
  private initializationPromise: Promise<boolean> | null = null;
  private tokenOptimizer: TokenOptimizer;

  constructor() {
    this.tokenOptimizer = new TokenOptimizer();
  }

  initialize(config: GeminiConfig): boolean {
    try {
      this.genAI = new GoogleGenAI({ apiKey: config.apiKey });
      this.apiKey = config.apiKey;
      this.modelName = config.model || 'gemini-2.5-flash';
      this.lastError = null;
      return true;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Unknown initialization error';
      console.error('Gemini initialization failed:', error);
      return false;
    }
  }

  async ensureInitialized(apiKey: string): Promise<boolean> {
    // If already initialized with the same API key, return true
    if (this.isInitialized() && this.apiKey === apiKey) {
      return true;
    }
    
    // If different API key, reset and reinitialize
    if (this.apiKey !== apiKey) {
      this.reset();
    }
    
    // If there's an ongoing initialization, wait for it
    if (this.initializationPromise) {
      return await this.initializationPromise;
    }
    
    // Start new initialization
    this.initializationPromise = this.performInitialization(apiKey);
    
    try {
      const result = await this.initializationPromise;
      return result;
    } finally {
      this.initializationPromise = null;
    }
  }

  private async performInitialization(apiKey: string): Promise<boolean> {
    this.isInitializing = true;
    try {
      console.log('🔄 Starting Gemini service initialization...');
      const result = await this.initializeWithRetry({ apiKey });
      if (result) {
        console.log('✅ Gemini service initialized successfully');
      } else {
        console.error('❌ Gemini service initialization failed');
      }
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
      this.lastError = errorMessage;
      console.error('❌ Gemini service initialization failed:', errorMessage);
      console.error('Full error:', error);
      return false;
    } finally {
      this.isInitializing = false;
    }
  }

  private reset(): void {
    this.genAI = null;
    this.apiKey = '';
    this.modelName = '';
    this.lastError = null;
    this.initializationPromise = null;
  }

  async initializeWithRetry(config: GeminiConfig, maxRetries: number = 3): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      if (this.initialize(config)) {
        return true;
      }
      
      if (i < maxRetries - 1) {
        console.log(`Initialization attempt ${i + 1} failed, retrying in ${(i + 1) * 1000}ms...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    return false;
  }

  getLastError(): string | null {
    return this.lastError;
  }

  // Smart Chunker for handling long texts
  private createSmartChunker(): SmartChunker {
    return new SmartChunker();
  }

  // Token Optimizer for efficient processing
  private createTokenOptimizer(): TokenOptimizer {
    return new TokenOptimizer();
  }
  
  private shouldUseChunking(content: string, estimatedTokens: number, contentAnalysis: { codeRatio: number; mathRatio: number; tableRatio: number; listRatio: number }): boolean {
    // Base thresholds
    const baseCharLimit = 15000;
    const baseTokenLimit = 25000;
    
    // Adjust thresholds based on content type
    let charMultiplier = 1.0;
    let tokenMultiplier = 1.0;
    
    // Code-heavy content: lower threshold (harder to process)
    if (contentAnalysis.codeRatio > 0.3) {
      charMultiplier = 0.6;
      tokenMultiplier = 0.7;
    }
    // Math-heavy content: lower threshold
    else if (contentAnalysis.mathRatio > 0.2) {
      charMultiplier = 0.7;
      tokenMultiplier = 0.8;
    }
    // Table-heavy content: higher threshold (better to keep tables together)
    else if (contentAnalysis.tableRatio > 0.2) {
      charMultiplier = 1.3;
      tokenMultiplier = 1.2;
    }
    // List-heavy content: moderate threshold
    else if (contentAnalysis.listRatio > 0.3) {
      charMultiplier = 0.9;
      tokenMultiplier = 0.9;
    }
    
    const adjustedCharLimit = baseCharLimit * charMultiplier;
    const adjustedTokenLimit = baseTokenLimit * tokenMultiplier;
    
    // Also consider document structure
    const headingCount = (content.match(/^#{1,6}\s/gm) || []).length;
    const hasComplexStructure = headingCount > 5;
    
    // If document has complex structure, prefer chunking at lower thresholds
    if (hasComplexStructure) {
      return content.length > adjustedCharLimit * 0.8 || estimatedTokens > adjustedTokenLimit * 0.8;
    }
    
    return content.length > adjustedCharLimit || estimatedTokens > adjustedTokenLimit;
  }

  async reformatMarkdown(content: string, onProgress?: (progress: { current: number; total: number; status: string }) => void): Promise<ReformatResponse> {
    if (!this.genAI) {
      console.error('❌ Reformat failed: Service not initialized');
      return {
        success: false,
        content: '',
        error: 'Gemini service not initialized. Please check your API key.'
      };
    }

    try {
      console.log('🔄 Starting markdown reformat...');
      
      // Initialize chunker and optimizer
      const chunker = this.createSmartChunker();
      const optimizer = this.createTokenOptimizer();
      
      // Analyze content structure for intelligent chunking decision
      const contentAnalysis = optimizer.analyzeContentComplexity(content);
      const estimatedTokens = optimizer.estimateTokens(content);
      
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
      
      const optimalChunkSize = optimizer.optimizeChunkSize(content);
      const chunks = chunker.chunkText(content, { 
        maxChunkSize: optimalChunkSize,
        maxOutputTokens: optimizer.getOptimalOutputTokenLimit(optimalChunkSize)
      });
      
      console.log(`📊 Split into ${chunks.length} chunks for processing`);
      
      const reformattedChunks: string[] = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkContext = chunker.buildChunkContext(chunk, content);
        
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
  
  private async reformatSingleChunk(content: string): Promise<ReformatResponse> {
    try {
      const prompt = this.buildReformatPrompt(content);
      
      const response = await this.genAI!.models.generateContent({
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

  async rewriteContent(content: string, prompt: string, context?: { beforeText?: string; afterText?: string; documentStructure?: string; fullDocument?: string }): Promise<RewriteResponse> {
    if (!this.genAI) {
      console.error('❌ Rewrite failed: Service not initialized');
      return {
        success: false,
        content: '',
        error: 'Gemini service not initialized. Please check your API key.'
      };
    }

    try {
      console.log('🔄 Starting content rewrite with instructions:', prompt);
      
      // Enhanced context analysis with full document awareness
      const enhancedContext = this.buildEnhancedRewriteContext(content, prompt, context);
      
      // Use chunking strategy for large content while preserving context
      if (enhancedContext.shouldUseChunking) {
        return await this.rewriteWithChunking(content, prompt, enhancedContext);
      }
      
      const fullPrompt = this.buildOptimizedRewritePrompt(content, prompt, enhancedContext);

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

  private buildEnhancedRewriteContext(content: string, prompt: string, context?: { beforeText?: string; afterText?: string; documentStructure?: string; fullDocument?: string }) {
    const beforeText = context?.beforeText || '';
    const afterText = context?.afterText || '';
    const documentStructure = context?.documentStructure || '';
    const fullDocument = context?.fullDocument || (beforeText + content + afterText);
    
    // Advanced document analysis
    const documentAnalysis = this.performDeepDocumentAnalysis(fullDocument, content);
    const contentComplexity = this.tokenOptimizer.analyzeContentComplexity(content);
    const estimatedTokens = this.tokenOptimizer.estimateTokens(content + prompt + beforeText + afterText);
    
    // Determine optimal processing strategy
    const shouldUseChunking = estimatedTokens > 800000 || content.length > 50000;
    const contextWindow = this.calculateOptimalContextWindow(content, beforeText, afterText);
    
    // Extract semantic relationships
    const semanticContext = this.extractSemanticContext(content, fullDocument);
    
    // Optimize generation parameters based on content type
    const generationParams = this.optimizeGenerationParameters(documentAnalysis, contentComplexity, prompt);
    
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

  private performDeepDocumentAnalysis(fullDocument: string, targetContent: string) {
    const lines = fullDocument.split('\n');
    const targetLines = targetContent.split('\n');
    
    // Document structure analysis
    const headings = fullDocument.match(/^#{1,6}\s+.+$/gm) || [];
    const headingHierarchy = this.buildHeadingHierarchy(headings);
    
    // Content type detection with confidence scores
    const contentTypes = {
      technical: this.calculateContentTypeScore(fullDocument, /\b(API|function|class|method|algorithm|implementation|code|syntax|programming|software|development|framework|library)\b/gi),
      academic: this.calculateContentTypeScore(fullDocument, /\b(research|study|analysis|conclusion|methodology|hypothesis|theory|experiment|data|results|findings)\b/gi),
      business: this.calculateContentTypeScore(fullDocument, /\b(strategy|market|customer|revenue|business|company|product|sales|marketing|profit|growth)\b/gi),
      creative: this.calculateContentTypeScore(fullDocument, /\b(story|narrative|character|plot|creative|artistic|design|aesthetic|visual|inspiration)\b/gi),
      mathematical: this.calculateContentTypeScore(fullDocument, /\$[^$]+\$|\$\$[\s\S]*?\$\$|\b(equation|formula|theorem|proof|calculation|mathematics|algebra|calculus)\b/gi)
    };
    
    const dominantType = Object.entries(contentTypes).reduce((a, b) => contentTypes[a[0]] > contentTypes[b[0]] ? a : b)[0];
    
    // Writing style analysis
    const styleMetrics = {
      averageSentenceLength: this.calculateAverageSentenceLength(fullDocument),
      formalityScore: this.calculateFormalityScore(fullDocument),
      technicalDensity: this.calculateTechnicalDensity(fullDocument),
      readabilityLevel: this.estimateReadabilityLevel(fullDocument)
    };
    
    // Cross-reference analysis
    const crossReferences = this.findCrossReferences(targetContent, fullDocument);
    
    return {
      headingHierarchy,
      contentTypes,
      dominantType,
      styleMetrics,
      crossReferences,
      documentLength: fullDocument.length,
      targetPosition: this.findContentPosition(targetContent, fullDocument)
    };
  }

  private extractSemanticContext(content: string, fullDocument: string) {
    // Find related sections based on keyword overlap
    const contentKeywords = this.extractKeywords(content);
    const relatedSections = this.findRelatedSections(contentKeywords, fullDocument, content);
    
    // Extract terminology consistency patterns
    const terminologyMap = this.buildTerminologyMap(fullDocument);
    
    // Identify content dependencies
    const dependencies = this.identifyContentDependencies(content, fullDocument);
    
    return {
      relatedSections,
      terminologyMap,
      dependencies,
      keywords: contentKeywords
    };
  }

  private calculateOptimalContextWindow(content: string, beforeText: string, afterText: string) {
    const contentTokens = this.tokenOptimizer.estimateTokens(content);
    const maxContextTokens = Math.min(200000, Math.floor((1000000 - contentTokens) * 0.4));
    
    // Intelligent context selection
    const beforeTokens = this.tokenOptimizer.estimateTokens(beforeText);
    const afterTokens = this.tokenOptimizer.estimateTokens(afterText);
    
    let optimalBefore = beforeText;
    let optimalAfter = afterText;
    
    if (beforeTokens + afterTokens > maxContextTokens) {
      const ratio = beforeTokens / (beforeTokens + afterTokens);
      const beforeLimit = Math.floor(maxContextTokens * ratio);
      const afterLimit = maxContextTokens - beforeLimit;
      
      optimalBefore = this.truncateContextIntelligently(beforeText, beforeLimit, 'before');
      optimalAfter = this.truncateContextIntelligently(afterText, afterLimit, 'after');
    }
    
    return {
      before: optimalBefore,
      after: optimalAfter,
      totalTokens: this.tokenOptimizer.estimateTokens(optimalBefore + optimalAfter)
    };
  }

  private buildReformatPrompt(content: string, context?: ChunkContext): string {
    const contextInfo = context ? `

DOCUMENT CONTEXT:
- Position: Chunk ${context.currentPosition + 1} of ${context.totalChunks}
- Document structure: ${context.documentStructure}
- Style patterns: ${context.styleGuide}
- Preceding content preview: ${context.precedingContent}
- Following content preview: ${context.followingPreview}` : '';

    return `You are an expert markdown and code formatting specialist with advanced knowledge of mathematical notation and KaTeX. Your task is to clean up and beautify markdown content while preserving ALL original content and meaning.${contextInfo}

CRITICAL RULES:
1. NEVER change the actual content, meaning, or information
2. NEVER add or remove any substantive text
3. ONLY fix formatting, syntax, and presentation issues
4. Preserve all links, images, code blocks, and special formatting
5. Fix markdown syntax errors and inconsistencies
6. Standardize spacing and indentation
7. Clean up formatting issues:
   - Remove HTML comments like <!---->
   - Fix merged/concatenated words (e.g., "**PDF-LIB**là" → "**PDF-LIB** là")
   - Correct spacing around punctuation and formatting
   - Fix code blocks that are improperly formatted or on single lines
   - Ensure proper line breaks and paragraph spacing
   - Standardize bullet points and numbering
   - Fix table formatting if present
8. Fix code formatting issues:
   - Separate code that has been merged into single lines
   - Add proper line breaks and indentation in code blocks
   - Fix code block syntax (\`\`\` markers)
   - Ensure proper spacing in code
   - Fix bracket and parentheses alignment
   - Correct string formatting in code
   - Fix comment formatting in code
   - Preserve original programming language and syntax
9. Handle mathematical content with KaTeX support:
   - Convert inline math to proper KaTeX format: $equation$
   - Convert display math to proper KaTeX format: $$equation$$
   - Fix malformed mathematical expressions
   - Ensure proper spacing around mathematical notation
   - Preserve mathematical symbols and Greek letters
   - Fix fraction notation, superscripts, and subscripts
   - Handle matrices, integrals, summations correctly
10. Maintain the original language and tone
11. Return ONLY the cleaned markdown, no explanations

Content to reformat:
\`\`\`markdown
${content}
\`\`\`

Cleaned content:`;
  }

  private async reformatChunkWithContext(chunk: TextChunk, context: ChunkContext): Promise<ReformatResponse> {
    try {
      const prompt = this.buildReformatPrompt(chunk.content, context);
      
      const response = await this.genAI!.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          temperature: 0.1,
          topK: 1,
          topP: 0.8,
          maxOutputTokens: context.currentPosition === 0 ? 32768 : 24576, // More tokens for first chunk
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

  private mergeChunks(reformattedChunks: string[], originalChunks: TextChunk[]): string {
    if (reformattedChunks.length === 1) {
      return reformattedChunks[0];
    }

    let mergedContent = '';
    
    for (let i = 0; i < reformattedChunks.length; i++) {
      const chunk = reformattedChunks[i];
      const originalChunk = originalChunks[i];
      
      if (i === 0) {
        // First chunk - use as is
        mergedContent = chunk;
      } else {
        // Subsequent chunks - remove overlap and merge
        const deduplicatedChunk = this.removeOverlap(chunk, mergedContent, originalChunk);
        
        // Ensure proper spacing between chunks
        const needsSpacing = !mergedContent.endsWith('\n\n') && !deduplicatedChunk.startsWith('\n');
        const separator = needsSpacing ? '\n\n' : '';
        
        mergedContent += separator + deduplicatedChunk;
      }
    }
    
    return mergedContent.trim();
  }

  private removeOverlap(currentChunk: string, previousContent: string, originalChunk: TextChunk): string {
    // Simple overlap removal based on line matching
    const currentLines = currentChunk.split('\n');
    const previousLines = previousContent.split('\n');
    
    // Find overlap by comparing last lines of previous content with first lines of current chunk
    let overlapLines = 0;
    const maxOverlap = Math.min(10, currentLines.length, previousLines.length);
    
    for (let i = 1; i <= maxOverlap; i++) {
      const prevLine = previousLines[previousLines.length - i]?.trim();
      const currLine = currentLines[i - 1]?.trim();
      
      if (prevLine && currLine && prevLine === currLine) {
        overlapLines = i;
      } else {
        break;
      }
    }
    
    // Remove overlapping lines from current chunk
    return currentLines.slice(overlapLines).join('\n');
  }

  private async rewriteWithChunking(content: string, prompt: string, enhancedContext: any): Promise<RewriteResponse> {
    try {
      console.log('🔄 Using chunking strategy for large content rewrite');
      
      const chunker = new SmartChunker();
      const chunks = chunker.chunkText(content, {
        maxChunkSize: enhancedContext.contentComplexity.codeRatio > 0.3 ? 12000 : 18000,
        overlapSize: 800,
        preserveStructure: true
      });
      
      const rewrittenChunks: string[] = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkContext = this.buildChunkRewriteContext(chunk, enhancedContext, i, chunks.length);
        
        const chunkPrompt = this.buildOptimizedRewritePrompt(chunk.content, prompt, {
          ...enhancedContext,
          ...chunkContext,
          isChunk: true,
          chunkPosition: i,
          totalChunks: chunks.length
        });
        
        const response = await this.genAI!.models.generateContent({
          model: this.modelName,
          contents: chunkPrompt,
          config: {
            temperature: enhancedContext.optimalTemperature,
            topK: enhancedContext.optimalTopK,
            topP: enhancedContext.optimalTopP,
            maxOutputTokens: Math.min(32768, enhancedContext.optimalOutputTokens),
          }
        });
        
        const cleanChunk = this.cleanResponseContent(response.text.trim());
        rewrittenChunks.push(cleanChunk);
        
        // Brief pause to avoid rate limiting
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Intelligent chunk merging with context preservation
      const mergedContent = this.mergeRewrittenChunks(rewrittenChunks, chunks, enhancedContext);
      
      console.log('✅ Chunked content rewrite completed successfully');
      return {
        success: true,
        content: mergedContent
      };
    } catch (error: any) {
      console.error('❌ Chunked rewrite failed:', error);
      return {
        success: false,
        content: '',
        error: error.message || 'Failed to rewrite content with chunking'
      };
    }
  }

  private buildOptimizedRewritePrompt(content: string, prompt: string, context: any): string {
    const isChunk = context.isChunk || false;
    const chunkInfo = isChunk ? `\n\nCHUNK PROCESSING INFO:\n- Processing chunk ${context.chunkPosition + 1} of ${context.totalChunks}\n- Maintain consistency with document style and terminology\n- Ensure smooth transitions if this is a middle chunk` : '';
    
    return `You are an expert content rewriting assistant with deep understanding of document context, structure, and mathematical notation using KaTeX. You have access to the full document context to ensure perfect coherence and consistency.

User instructions: ${prompt}

DOCUMENT ANALYSIS:
- Document type: ${context.documentAnalysis?.dominantType || 'general'} (confidence: ${Math.round((context.documentAnalysis?.contentTypes?.[context.documentAnalysis?.dominantType] || 0) * 100)}%)
- Writing style: ${this.describeWritingStyle(context.documentAnalysis?.styleMetrics)}
- Technical density: ${context.contentComplexity?.codeRatio > 0.2 ? 'High' : context.contentComplexity?.mathRatio > 0.1 ? 'Medium' : 'Low'}
- Document structure: ${context.documentAnalysis?.headingHierarchy?.join(' → ') || 'Flat structure'}

CONTEXT AWARENESS:
- Content position: ${context.documentAnalysis?.targetPosition || 'Unknown'}
- Related sections: ${context.semanticContext?.relatedSections?.slice(0, 3).join(', ') || 'None identified'}
- Key terminology: ${context.semanticContext?.keywords?.slice(0, 10).join(', ') || 'None extracted'}
- Cross-references: ${context.semanticContext?.dependencies?.length || 0} found

CRITICAL REWRITING GUIDELINES:
1. Follow user instructions precisely while maintaining document coherence
2. Preserve the established writing style and tone (${context.documentAnalysis?.dominantType} style)
3. Maintain consistency with document terminology and concepts
4. Ensure smooth transitions with surrounding content
5. Preserve all markdown formatting, structure, and mathematical notation
6. Handle mathematical content with KaTeX support:
   - Inline math: $equation$
   - Display math: $$equation$$
   - Preserve mathematical symbols, Greek letters, and notation
7. Maintain cross-references and document relationships
8. Keep appropriate detail level for document context
9. Return only the rewritten markdown content, no explanations${chunkInfo}

${context.contextWindow?.before ? `\nPRECEDING CONTEXT:\n\`\`\`\n${context.contextWindow.before.slice(-1000)}\n\`\`\`` : ''}

CONTENT TO REWRITE:
\`\`\`markdown
${content}
\`\`\`

${context.contextWindow?.after ? `\nFOLLOWING CONTEXT:\n\`\`\`\n${context.contextWindow.after.slice(0, 1000)}\n\`\`\`` : ''}

Rewritten content:`;
  }

  private cleanResponseContent(content: string): string {
    return content
      .replace(/^```markdown\s*\n/, '')
      .replace(/\n```$/, '')
      .replace(/^```\s*\n/, '')
      .replace(/\n```$/, '')
      .trim();
  }

  private optimizeGenerationParameters(documentAnalysis: any, contentComplexity: any, prompt: string) {
    // Adjust temperature based on content type and user intent
    let temperature = 0.6;
    if (documentAnalysis?.dominantType === 'technical' || contentComplexity?.codeRatio > 0.2) {
      temperature = 0.3; // Lower for technical content
    } else if (documentAnalysis?.dominantType === 'creative') {
      temperature = 0.8; // Higher for creative content
    } else if (prompt.toLowerCase().includes('formal') || prompt.toLowerCase().includes('academic')) {
      temperature = 0.4; // Lower for formal rewriting
    }
    
    // Adjust other parameters
    const topK = contentComplexity?.codeRatio > 0.2 ? 20 : 40;
    const topP = documentAnalysis?.dominantType === 'technical' ? 0.8 : 0.9;
    const outputTokens = Math.min(32768, Math.max(8192, Math.floor(contentComplexity?.codeRatio > 0.2 ? 16384 : 24576)));
    
    return {
      optimalTemperature: temperature,
      optimalTopK: topK,
      optimalTopP: topP,
      optimalOutputTokens: outputTokens
    };
  }

  // Helper methods for enhanced analysis
  private calculateContentTypeScore(text: string, pattern: RegExp): number {
    const matches = text.match(pattern) || [];
    return Math.min(1.0, matches.length / Math.max(1, text.split(' ').length / 100));
  }

  private buildHeadingHierarchy(headings: string[]): string[] {
    return headings.slice(0, 10).map(h => h.replace(/^#+\s*/, '').trim());
  }

  private calculateAverageSentenceLength(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const totalWords = text.split(/\s+/).length;
    return sentences.length > 0 ? totalWords / sentences.length : 0;
  }

  private calculateFormalityScore(text: string): number {
    const formalWords = text.match(/\b(therefore|however|furthermore|consequently|nevertheless|moreover)\b/gi) || [];
    const informalWords = text.match(/\b(gonna|wanna|yeah|ok|cool|awesome)\b/gi) || [];
    const totalWords = text.split(/\s+/).length;
    return (formalWords.length - informalWords.length) / Math.max(1, totalWords / 100);
  }

  private calculateTechnicalDensity(text: string): number {
    const technicalTerms = text.match(/\b[A-Z]{2,}\b|\w+\(\)|\w+\.\w+|\b\w*[A-Z]\w*[A-Z]\w*\b/g) || [];
    const totalWords = text.split(/\s+/).length;
    return technicalTerms.length / Math.max(1, totalWords);
  }

  private estimateReadabilityLevel(text: string): string {
    const avgSentenceLength = this.calculateAverageSentenceLength(text);
    const avgWordLength = text.split(/\s+/).reduce((sum, word) => sum + word.length, 0) / Math.max(1, text.split(/\s+/).length);
    
    if (avgSentenceLength > 25 || avgWordLength > 6) return 'Advanced';
    if (avgSentenceLength > 15 || avgWordLength > 5) return 'Intermediate';
    return 'Basic';
  }

  private findContentPosition(content: string, fullDocument: string): string {
    const index = fullDocument.indexOf(content.trim().substring(0, 100));
    const totalLength = fullDocument.length;
    if (index === -1) return 'Unknown';
    
    const position = index / totalLength;
    if (position < 0.2) return 'Beginning';
    if (position < 0.8) return 'Middle';
    return 'End';
  }

  private extractKeywords(content: string): string[] {
    const words = content.toLowerCase().match(/\b\w{4,}\b/g) || [];
    const frequency = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([word]) => word);
  }

  private findRelatedSections(keywords: string[], fullDocument: string, excludeContent: string): string[] {
    const sections = fullDocument.split(/\n#{1,6}\s+/).filter(section => 
      section.length > 100 && !section.includes(excludeContent.substring(0, 100))
    );
    
    return sections
      .map(section => {
        const score = keywords.reduce((sum, keyword) => 
          sum + (section.toLowerCase().includes(keyword) ? 1 : 0), 0
        );
        return { section: section.substring(0, 200), score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(item => item.section);
  }

  private buildTerminologyMap(fullDocument: string): Record<string, number> {
    const terms = fullDocument.match(/\b[A-Z][a-z]*(?:\s+[A-Z][a-z]*)*\b/g) || [];
    return terms.reduce((acc, term) => {
      if (term.length > 3) {
        acc[term] = (acc[term] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
  }

  private identifyContentDependencies(content: string, fullDocument: string): string[] {
    const references = content.match(/\b(?:see|refer to|as mentioned|according to|in section)\b[^.]*\b[A-Z][^.]*\b/gi) || [];
    return references.slice(0, 10);
  }

  private findCrossReferences(content: string, fullDocument: string): string[] {
    const crossRefs: string[] = [];
    
    // Find explicit references
    const explicitRefs = content.match(/\b(?:see|refer to|as mentioned|according to|in section|chapter|figure|table)\s+[^.]*\b/gi) || [];
    crossRefs.push(...explicitRefs);
    
    // Find heading references
    const headings = fullDocument.match(/^#{1,6}\s+(.+)$/gm) || [];
    const headingTitles = headings.map(h => h.replace(/^#+\s*/, '').trim());
    
    for (const title of headingTitles) {
      if (title.length > 3 && content.toLowerCase().includes(title.toLowerCase()) && !content.includes(`# ${title}`)) {
        crossRefs.push(`Reference to: ${title}`);
      }
    }
    
    // Find numbered references
    const numberedRefs = content.match(/\[[0-9]+\]|\([0-9]+\)|\b(?:ref|reference)\s*[0-9]+\b/gi) || [];
    crossRefs.push(...numberedRefs);
    
    return crossRefs.slice(0, 10);
  }

  private truncateContextIntelligently(text: string, tokenLimit: number, direction: 'before' | 'after'): string {
    const charLimit = tokenLimit * 3.5; // Approximate conversion
    if (text.length <= charLimit) return text;
    
    if (direction === 'before') {
      // Keep the end of the before context
      const truncated = text.slice(-charLimit);
      // Try to start at a paragraph boundary
      const paragraphStart = truncated.indexOf('\n\n');
      return paragraphStart > 0 ? truncated.slice(paragraphStart) : truncated;
    } else {
      // Keep the beginning of the after context
      const truncated = text.slice(0, charLimit);
      // Try to end at a paragraph boundary
      const paragraphEnd = truncated.lastIndexOf('\n\n');
      return paragraphEnd > charLimit * 0.7 ? truncated.slice(0, paragraphEnd) : truncated;
    }
  }

  private buildChunkRewriteContext(chunk: TextChunk, enhancedContext: any, position: number, total: number) {
    return {
      chunkSpecificContext: `Chunk ${position + 1}/${total}: ${chunk.type} content`,
      maintainConsistency: position > 0,
      isFirstChunk: position === 0,
      isLastChunk: position === total - 1
    };
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

  private describeWritingStyle(styleMetrics: any): string {
    if (!styleMetrics) return 'Standard';
    
    const { averageSentenceLength, formalityScore, technicalDensity } = styleMetrics;
    
    let style = '';
    if (formalityScore > 0.1) style += 'Formal, ';
    if (technicalDensity > 0.1) style += 'Technical, ';
    if (averageSentenceLength > 20) style += 'Complex, ';
    else if (averageSentenceLength < 12) style += 'Concise, ';
    
    return style.slice(0, -2) || 'Standard';
  }

  isInitialized(): boolean {
    return this.genAI !== null;
  }
}

// Smart Chunker for intelligent text segmentation
class SmartChunker {
  private readonly DEFAULT_CONFIG: ChunkingConfig = {
    maxChunkSize: 15000, // characters
    overlapSize: 500,
    preserveStructure: true,
    maxOutputTokens: 32768
  };

  chunkText(content: string, config?: Partial<ChunkingConfig>): TextChunk[] {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    const chunks: TextChunk[] = [];
    
    if (content.length <= finalConfig.maxChunkSize) {
      return [{
        content,
        position: 0,
        totalChunks: 1,
        type: this.detectContentType(content),
        startLine: 1,
        endLine: content.split('\n').length
      }];
    }

    const lines = content.split('\n');
    let currentChunk = '';
    let currentStartLine = 1;
    let chunkPosition = 0;
    let inCodeBlock = false;
    let inTable = false;
    let codeBlockFence = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = i < lines.length - 1 ? lines[i + 1] : '';
      
      // Track code block state
      if (line.match(/^```/)) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBlockFence = line;
        } else if (line === codeBlockFence || line === '```') {
          inCodeBlock = false;
          codeBlockFence = '';
        }
      }
      
      // Track table state
      if (line.match(/^\|.*\|$/)) {
        inTable = true;
      } else if (inTable && !line.match(/^\|.*\|$/) && line.trim() !== '') {
        inTable = false;
      }
      
      const potentialChunk = currentChunk + (currentChunk ? '\n' : '') + line;

      // Check if we should break here
      const shouldBreak = potentialChunk.length > finalConfig.maxChunkSize && 
                         currentChunk && 
                         this.shouldBreakHere(line, nextLine, inCodeBlock, inTable, i, lines);

      if (shouldBreak) {
        // Find optimal break point
        const breakPoint = this.findOptimalBreakPoint(lines, i, currentStartLine, inCodeBlock, inTable);
        
        // Create chunk up to break point
        const chunkLines = lines.slice(currentStartLine - 1, breakPoint);
        const chunkContent = chunkLines.join('\n');
        
        chunks.push({
          content: chunkContent,
          position: chunkPosition,
          totalChunks: 0,
          type: this.detectContentType(chunkContent),
          startLine: currentStartLine,
          endLine: breakPoint
        });

        // Start new chunk with intelligent overlap
        const overlapContent = this.createIntelligentOverlap(lines, breakPoint, finalConfig.overlapSize);
        currentChunk = overlapContent.content;
        currentStartLine = overlapContent.startLine;
        chunkPosition++;
        
        // Reset states for new chunk
        inCodeBlock = overlapContent.inCodeBlock;
        inTable = false;
      } else {
        currentChunk = potentialChunk;
      }
    }

    // Add final chunk
    if (currentChunk) {
      chunks.push({
        content: currentChunk,
        position: chunkPosition,
        totalChunks: 0,
        type: this.detectContentType(currentChunk),
        startLine: currentStartLine,
        endLine: lines.length
      });
    }

    // Update totalChunks for all chunks
    chunks.forEach(chunk => chunk.totalChunks = chunks.length);
    
    return chunks;
  }

  private detectContentType(content: string): TextChunk['type'] {
    const lines = content.trim().split('\n');
    
    if (lines.some(line => line.match(/^#{1,6}\s/))) return 'heading';
    if (lines.some(line => line.match(/^```/))) return 'code';
    if (lines.some(line => line.match(/^[-*+]\s|^\d+\.\s/))) return 'list';
    if (lines.some(line => line.match(/^\|.*\|/))) return 'table';
    if (lines.length === 1 || lines.every(line => !line.trim() || line.length < 100)) return 'paragraph';
    
    return 'mixed';
  }

  private shouldBreakHere(line: string, nextLine: string, inCodeBlock: boolean, inTable: boolean, lineIndex: number, lines: string[]): boolean {
    // Never break inside code blocks or tables
    if (inCodeBlock || inTable) {
      return false;
    }
    
    // Prefer breaking after headings
    if (line.match(/^#{1,6}\s/) && !nextLine.match(/^#{1,6}\s/)) {
      return true;
    }
    
    // Prefer breaking after complete paragraphs (empty line follows)
    if (line.trim() !== '' && nextLine.trim() === '') {
      return true;
    }
    
    // Prefer breaking before new sections
    if (nextLine.match(/^#{1,6}\s/)) {
      return true;
    }
    
    // Prefer breaking before code blocks
    if (nextLine.match(/^```/)) {
      return true;
    }
    
    // Prefer breaking before lists
    if (nextLine.match(/^[-*+]\s|^\d+\.\s/) && !line.match(/^[-*+]\s|^\d+\.\s/)) {
      return true;
    }
    
    return true; // Default: allow breaking
  }
  
  private findOptimalBreakPoint(lines: string[], currentIndex: number, startLine: number, inCodeBlock: boolean, inTable: boolean): number {
    // If we're in a code block or table, find the end
    if (inCodeBlock) {
      for (let i = currentIndex; i < lines.length; i++) {
        if (lines[i].match(/^```/)) {
          return i + 1;
        }
      }
    }
    
    if (inTable) {
      for (let i = currentIndex; i < lines.length; i++) {
        if (!lines[i].match(/^\|.*\|$/) && lines[i].trim() !== '') {
          return i;
        }
      }
    }
    
    // Look backwards for a good break point
    for (let i = currentIndex - 1; i >= startLine - 1; i--) {
      const line = lines[i];
      const nextLine = i < lines.length - 1 ? lines[i + 1] : '';
      
      // After heading
      if (line.match(/^#{1,6}\s/) && !nextLine.match(/^#{1,6}\s/)) {
        return i + 1;
      }
      
      // After paragraph (empty line follows)
      if (line.trim() !== '' && nextLine.trim() === '') {
        return i + 1;
      }
    }
    
    return currentIndex; // Fallback to current position
  }
  
  private createIntelligentOverlap(lines: string[], breakPoint: number, overlapSize: number): { content: string; startLine: number; inCodeBlock: boolean } {
    const overlapLines: string[] = [];
    let charCount = 0;
    let inCodeBlock = false;
    let startLine = breakPoint;
    
    // Look backwards for context, but respect markdown structure
    for (let i = breakPoint - 1; i >= 0 && charCount < overlapSize; i--) {
      const line = lines[i];
      
      // Don't include partial code blocks in overlap
      if (line.match(/^```/)) {
        if (inCodeBlock) {
          // End of code block, include it
          overlapLines.unshift(line);
          charCount += line.length + 1;
          inCodeBlock = false;
        } else {
          // Start of code block, don't include partial block
          break;
        }
      } else if (charCount + line.length <= overlapSize) {
        overlapLines.unshift(line);
        charCount += line.length + 1;
        startLine = i + 1;
        
        // Check if this line is inside a code block
        if (line.match(/^```/)) {
          inCodeBlock = true;
        }
      } else {
        break;
      }
      
      // Stop at heading boundaries for clean context
      if (line.match(/^#{1,6}\s/) && overlapLines.length > 1) {
        break;
      }
    }
    
    return {
      content: overlapLines.join('\n'),
      startLine,
      inCodeBlock
    };
  }
  
  private getOverlapLines(lines: string[], currentIndex: number, overlapSize: number): string[] {
    const overlapLines: string[] = [];
    let charCount = 0;
    
    for (let i = currentIndex - 1; i >= 0 && charCount < overlapSize; i--) {
      const line = lines[i];
      if (charCount + line.length <= overlapSize) {
        overlapLines.unshift(line);
        charCount += line.length + 1; // +1 for newline
      } else {
        break;
      }
    }
    
    return overlapLines;
  }

  buildChunkContext(chunk: TextChunk, originalContent: string): ChunkContext {
    const lines = originalContent.split('\n');
    const precedingContent = lines.slice(0, Math.max(0, chunk.startLine - 10)).join('\n');
    const followingPreview = lines.slice(chunk.endLine, chunk.endLine + 5).join('\n');
    
    return {
      documentStructure: this.extractDocumentStructure(originalContent),
      precedingContent: precedingContent.slice(-300),
      followingPreview: followingPreview.slice(0, 200),
      styleGuide: this.extractStyleGuide(originalContent),
      totalChunks: chunk.totalChunks,
      currentPosition: chunk.position
    };
  }

  private extractDocumentStructure(content: string): string {
    const headings = content.match(/^#{1,6}\s.+$/gm) || [];
    return headings.slice(0, 10).join('; ');
  }

  private extractStyleGuide(content: string): string {
    const patterns = {
      codeBlocks: (content.match(/```[\s\S]*?```/g) || []).length,
      mathBlocks: (content.match(/\$\$[\s\S]*?\$\$/g) || []).length,
      inlineMath: (content.match(/\$[^$]+\$/g) || []).length,
      tables: (content.match(/^\|.*\|$/gm) || []).length,
      lists: (content.match(/^[-*+]\s|^\d+\.\s/gm) || []).length
    };
    
    return Object.entries(patterns)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => `${type}: ${count}`)
      .join(', ');
  }
}

// Token Optimizer for efficient processing
class TokenOptimizer {
  private readonly TOKEN_LIMITS = {
    input: 1048576, // 1M tokens for Gemini 2.5 Flash
    output: 65535,  // Default output limit
    recommended: 32768 // Recommended for better performance
  };

  estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English
    // More conservative for mixed content
    return Math.ceil(text.length / 3.5);
  }

  optimizeChunkSize(content: string, targetOutputTokens: number = 32768): number {
    const contentAnalysis = this.analyzeContentComplexity(content);
    const estimatedTokens = this.estimateTokens(content);
    
    // Adjust chunk size based on content type
    let sizeMultiplier = 1.0;
    
    if (contentAnalysis.codeRatio > 0.3) {
      // Code-heavy content: smaller chunks for better processing
      sizeMultiplier = 0.7;
    } else if (contentAnalysis.mathRatio > 0.2) {
      // Math-heavy content: medium chunks
      sizeMultiplier = 0.8;
    } else if (contentAnalysis.tableRatio > 0.2) {
      // Table-heavy content: larger chunks to keep tables intact
      sizeMultiplier = 1.2;
    }
    
    // Conservative approach: use 60% of available space for input
    const maxInputTokens = Math.floor(this.TOKEN_LIMITS.input * 0.6 * sizeMultiplier);
    const ratio = targetOutputTokens / Math.max(estimatedTokens, 1);
    const optimalChunkTokens = Math.min(maxInputTokens, estimatedTokens * ratio);
    
    // Convert back to characters with content-aware ratio
    const charPerToken = contentAnalysis.codeRatio > 0.2 ? 2.5 : 3.5;
    return Math.floor(optimalChunkTokens * charPerToken);
  }
  
  analyzeContentComplexity(content: string): {
    codeRatio: number;
    mathRatio: number;
    tableRatio: number;
    listRatio: number;
  } {
    const lines = content.split('\n');
    const totalLines = lines.length;
    
    let codeLines = 0;
    let mathLines = 0;
    let tableLines = 0;
    let listLines = 0;
    let inCodeBlock = false;
    
    for (const line of lines) {
      if (line.match(/^```/)) {
        inCodeBlock = !inCodeBlock;
        codeLines++;
      } else if (inCodeBlock) {
        codeLines++;
      } else if (line.match(/\$\$[\s\S]*?\$\$|\$[^$]+\$/)) {
        mathLines++;
      } else if (line.match(/^\|.*\|$/)) {
        tableLines++;
      } else if (line.match(/^[-*+]\s|^\d+\.\s/)) {
        listLines++;
      }
    }
    
    return {
      codeRatio: codeLines / totalLines,
      mathRatio: mathLines / totalLines,
      tableRatio: tableLines / totalLines,
      listRatio: listLines / totalLines
    };
  }

  validateTokenLimits(inputText: string, expectedOutputTokens: number): boolean {
    const inputTokens = this.estimateTokens(inputText);
    return inputTokens <= this.TOKEN_LIMITS.input && 
           expectedOutputTokens <= this.TOKEN_LIMITS.output;
  }

  getOptimalOutputTokenLimit(chunkSize: number): number {
    const inputTokens = this.estimateTokens('x'.repeat(chunkSize));
    const availableOutput = Math.min(
      this.TOKEN_LIMITS.recommended,
      Math.floor((this.TOKEN_LIMITS.input - inputTokens) * 0.3)
    );
    
    return Math.max(8192, availableOutput);
  }
}

export default new GeminiService();