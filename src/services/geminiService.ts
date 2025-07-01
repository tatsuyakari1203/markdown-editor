import { GoogleGenAI } from '@google/genai';
import { GeminiConfig, ReformatResponse, RewriteResponse, TextChunk, ChunkingConfig, ChunkContext } from './gemini/types';
import { SmartChunker } from './gemini/SmartChunker';
import { TokenOptimizer } from './gemini/TokenOptimizer';
import { PromptBuilder } from './PromptBuilder';
import { DocumentAnalyzer } from './DocumentAnalyzer';
import { ContentProcessor } from './ContentProcessor';

class GeminiService {
  private genAI: GoogleGenAI | null = null;
  private apiKey: string = '';
  private modelName: string = '';
  private isInitializing: boolean = false;
  private lastError: string | null = null;
  private initializationPromise: Promise<boolean> | null = null;
  
  // Service modules
  private tokenOptimizer: TokenOptimizer;
  private smartChunker: SmartChunker;
  private promptBuilder: PromptBuilder;
  private documentAnalyzer: DocumentAnalyzer;
  private contentProcessor: ContentProcessor | null = null;

  constructor() {
    this.tokenOptimizer = new TokenOptimizer();
    this.smartChunker = new SmartChunker();
    this.promptBuilder = new PromptBuilder();
    this.documentAnalyzer = new DocumentAnalyzer(this.tokenOptimizer);
  }

  initialize(config: GeminiConfig): boolean {
    try {
      this.genAI = new GoogleGenAI({ apiKey: config.apiKey });
      this.apiKey = config.apiKey;
      this.modelName = config.model || 'gemini-2.0-flash-exp';
      this.lastError = null;
      
      // Initialize content processor with all dependencies
      this.contentProcessor = new ContentProcessor(
        this.genAI,
        this.modelName,
        this.smartChunker,
        this.tokenOptimizer,
        this.promptBuilder,
        this.documentAnalyzer
      );
      
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
      const success = this.initialize({ apiKey });
      
      if (success) {
        // Test the connection with a simple request
        await this.initializeWithRetry();
        console.log('✅ Gemini service initialized successfully');
        return true;
      } else {
        throw new Error('Failed to initialize Gemini service');
      }
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Initialization failed';
      console.error('❌ Gemini initialization failed:', this.lastError);
      return false;
    } finally {
      this.isInitializing = false;
    }
  }

  private async initializeWithRetry(maxRetries: number = 3): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!this.genAI) {
          throw new Error('GoogleGenerativeAI not initialized');
        }
        
        // Test with a minimal request
        await this.genAI.models.generateContent({
          model: this.modelName,
          contents: [{ role: 'user', parts: [{ text: 'Test' }] }],
          generationConfig: {
            maxOutputTokens: 10,
            temperature: 0.1
          }
        });
        
        return; // Success
      } catch (error) {
        console.warn(`Initialization attempt ${attempt}/${maxRetries} failed:`, error);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  reset(): void {
    this.genAI = null;
    this.apiKey = '';
    this.modelName = '';
    this.isInitializing = false;
    this.lastError = null;
    this.initializationPromise = null;
    this.contentProcessor = null;
  }

  isInitialized(): boolean {
    return this.genAI !== null && this.apiKey !== '' && this.contentProcessor !== null;
  }

  getLastError(): string | null {
    return this.lastError;
  }

  async reformatMarkdown(
    content: string,
    onProgress?: (progress: { current: number; total: number; status: string }) => void
  ): Promise<ReformatResponse> {
    if (!this.contentProcessor) {
      console.error('❌ Reformat failed: Service not initialized');
      return {
        success: false,
        content: '',
        error: 'Gemini service not initialized. Please check your API key.'
      };
    }

    return await this.contentProcessor.reformatMarkdown(content, onProgress);
  }

  async rewriteContent(
    content: string,
    prompt: string,
    options?: {
      beforeText?: string;
      afterText?: string;
      documentStructure?: string;
      fullDocument?: string;
    }
  ): Promise<RewriteResponse> {
    if (!this.contentProcessor) {
      console.error('❌ Rewrite failed: Service not initialized');
      return {
        success: false,
        content: '',
        error: 'Gemini service not initialized. Please check your API key.'
      };
    }

    return await this.contentProcessor.rewriteContent(content, prompt, options);
  }

  // Utility methods for external access to analyzers
  analyzeContentComplexity(content: string) {
    return this.tokenOptimizer.analyzeContentComplexity(content);
  }

  estimateTokens(content: string): number {
    return this.tokenOptimizer.estimateTokens(content);
  }

  validateTokenLimit(content: string, maxTokens: number): boolean {
    return this.tokenOptimizer.validateTokenLimit(content, maxTokens);
  }

  shouldUseChunking(content: string): boolean {
    const complexity = this.tokenOptimizer.analyzeContentComplexity(content);
    const tokens = this.tokenOptimizer.estimateTokens(content);
    return this.tokenOptimizer.shouldUseChunking(content, tokens, complexity);
  }

  getOptimalChunkSize(content: string): number {
    return this.tokenOptimizer.optimizeChunkSize(content);
  }

  performDocumentAnalysis(fullDocument: string, targetContent: string) {
    return this.documentAnalyzer.performDeepDocumentAnalysis(fullDocument, targetContent);
  }

  extractSemanticContext(content: string, fullDocument: string) {
    return this.documentAnalyzer.extractSemanticContext(content, fullDocument);
  }

  calculateOptimalContextWindow(content: string, beforeText: string, afterText: string) {
    return this.documentAnalyzer.calculateOptimalContextWindow(content, beforeText, afterText);
  }
}

// Export singleton instance
const geminiService = new GeminiService();
export default geminiService;
export { GeminiService };