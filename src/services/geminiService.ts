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

  async rewriteContent(content: string, prompt: string, context?: { beforeText?: string; afterText?: string; documentStructure?: string }): Promise<RewriteResponse> {
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
      
      // Analyze context for better understanding
      const contextAnalysis = this.analyzeDocumentContext(content, context);
      
      const fullPrompt = `You are an expert content rewriting assistant with deep understanding of document context, structure, and mathematical notation using KaTeX. Rewrite the given content according to the user's specific instructions while maintaining coherence with the surrounding content.

User instructions: ${prompt}

${contextAnalysis.contextInfo}

IMPORTANT GUIDELINES:
1. Follow the user's instructions precisely while maintaining document coherence
2. Consider the surrounding context to ensure smooth transitions
3. Maintain consistent tone, style, and terminology with the document
4. Preserve markdown formatting and structure
5. Ensure the rewritten content flows naturally with preceding and following sections
6. Keep appropriate length and detail level for the document context
7. Maintain any cross-references or connections to other parts of the document
8. Handle mathematical content with KaTeX support:
   - Use proper KaTeX format for inline math: $equation$
   - Use proper KaTeX format for display math: $$equation$$
   - Preserve mathematical symbols, Greek letters, and notation
   - Maintain proper spacing around mathematical expressions
   - Handle fractions, superscripts, subscripts, matrices correctly
9. Return only the rewritten markdown content, no explanations

${contextAnalysis.structureInfo}

Content to rewrite:
\`\`\`markdown
${content}
\`\`\`

${contextAnalysis.beforeContext}
${contextAnalysis.afterContext}

Rewritten content:`;

      const response = await this.genAI.models.generateContent({
        model: this.modelName,
        contents: fullPrompt,
        config: {
          temperature: 0.6, // Slightly lower for more consistent style
          topK: 40,
          topP: 0.9,
          maxOutputTokens: 8192,
        }
      });

      const rewrittenContent = response.text.trim();

      // Remove markdown code block wrapper if present
      const cleanContent = rewrittenContent
        .replace(/^```markdown\s*\n/, '')
        .replace(/\n```$/, '')
        .replace(/^```\s*\n/, '')
        .replace(/\n```$/, '');

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

  private analyzeDocumentContext(content: string, context?: { beforeText?: string; afterText?: string; documentStructure?: string }) {
    const beforeText = context?.beforeText || '';
    const afterText = context?.afterText || '';
    const documentStructure = context?.documentStructure || '';
    
    // Analyze document tone and style
    const fullText = beforeText + content + afterText;
    const isTechnical = /\b(API|function|class|method|algorithm|implementation|code|syntax)\b/i.test(fullText);
    const isAcademic = /\b(research|study|analysis|conclusion|methodology|hypothesis)\b/i.test(fullText);
    const isBusiness = /\b(strategy|market|customer|revenue|business|company|product)\b/i.test(fullText);
    const isCreative = /\b(story|narrative|character|plot|creative|artistic)\b/i.test(fullText);
    
    let toneGuidance = '';
    if (isTechnical) toneGuidance = 'Maintain technical precision and clarity.';
    else if (isAcademic) toneGuidance = 'Keep academic rigor and formal tone.';
    else if (isBusiness) toneGuidance = 'Preserve professional business language.';
    else if (isCreative) toneGuidance = 'Maintain creative and engaging style.';
    else toneGuidance = 'Keep the natural conversational tone.';
    
    // Extract headings and structure
    const headings = fullText.match(/^#{1,6}\s+.+$/gm) || [];
    const listItems = fullText.match(/^\s*[-*+]\s+.+$/gm) || [];
    const codeBlocks = fullText.match(/```[\s\S]*?```/g) || [];
    
    let structureInfo = '';
    if (headings.length > 0) {
      structureInfo += `Document structure includes headings: ${headings.slice(0, 3).join(', ')}${headings.length > 3 ? '...' : ''}. `;
    }
    if (listItems.length > 0) {
      structureInfo += `Contains structured lists. `;
    }
    if (codeBlocks.length > 0) {
      structureInfo += `Includes code examples. `;
    }
    
    // Context before and after
    const beforeContext = beforeText ? `\nContent before (for context):\n\`\`\`\n${beforeText.slice(-500)}\n\`\`\`` : '';
    const afterContext = afterText ? `\nContent after (for context):\n\`\`\`\n${afterText.slice(0, 500)}\n\`\`\`` : '';
    
    return {
      contextInfo: `DOCUMENT CONTEXT: ${toneGuidance} ${structureInfo}`.trim(),
      structureInfo: documentStructure ? `Document structure: ${documentStructure}` : '',
      beforeContext,
      afterContext
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