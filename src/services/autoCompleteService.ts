import { GoogleGenAI } from '@google/genai';

export interface AutoCompleteConfig {
  apiKey: string;
  model?: string;
  maxSuggestions?: number;
  maxTokens?: number;
}

export interface AutoCompleteResponse {
  success: boolean;
  suggestions: string[];
  error?: string;
}

export interface AutoCompleteContext {
  textBeforeCursor: string;
  textAfterCursor: string;
  currentLine: string;
  lineNumber: number;
  column: number;
  fullText: string;
  cursorPosition: number;
  // Legacy properties for backward compatibility
  text?: string;
  contextBefore?: string;
  contextAfter?: string;
}

class AutoCompleteService {
  private genAI: GoogleGenAI | null = null;
  private apiKey: string = '';
  private modelName: string = 'gemini-2.5-flash';
  private cache = new Map<string, { suggestions: string[]; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100;
  private abortController: AbortController | null = null;
  private requestCount = 0;
  private lastRequestTime = 0;
  private readonly RATE_LIMIT = 10; // requests per minute
  private readonly RATE_WINDOW = 60 * 1000; // 1 minute

  initialize(config: AutoCompleteConfig): boolean {
    try {
      this.genAI = new GoogleGenAI({ apiKey: config.apiKey });
      this.apiKey = config.apiKey;
      this.modelName = config.model || 'gemini-2.0-flash';
      return true;
    } catch (error) {
      console.error('AutoComplete initialization failed:', error);
      return false;
    }
  }

  isInitialized(): boolean {
    return this.genAI !== null && this.apiKey !== '';
  }

  private generateCacheKey(context: AutoCompleteContext): string {
    const textBefore = context.textBeforeCursor || context.contextBefore || '';
    return `${textBefore.slice(-100)}_${context.cursorPosition}`;
  }

  private getCachedSuggestions(cacheKey: string): string[] | null {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.suggestions;
    }
    return null;
  }

  private setCachedSuggestions(cacheKey: string, suggestions: string[]): void {
    // Clean old cache entries if needed
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(cacheKey, {
      suggestions,
      timestamp: Date.now()
    });
  }

  private checkRateLimit(): boolean {
    const now = Date.now();
    
    // Reset counter if window has passed
    if (now - this.lastRequestTime > this.RATE_WINDOW) {
      this.requestCount = 0;
      this.lastRequestTime = now;
    }
    
    if (this.requestCount >= this.RATE_LIMIT) {
      return false;
    }
    
    this.requestCount++;
    return true;
  }

  private buildPrompt(context: AutoCompleteContext): string {
    // Use new properties with fallback to legacy ones
    const textBefore = context.textBeforeCursor || context.contextBefore || '';
    const textAfter = context.textAfterCursor || context.contextAfter || '';
    const currentLine = context.currentLine || '';
    
    // Enhanced context analysis
    const lines = textBefore.split('\n');
    const currentLineText = lines[lines.length - 1] || '';
    
    // Get extended context with intelligent summarization
    const { contextSummary, recentLines, documentStructure } = this.analyzeExtendedContext(textBefore, textAfter);
    
    // Detect content type and context
    const isListItem = /^\s*[-*+]\s/.test(currentLineText) || /^\s*\d+\.\s/.test(currentLineText);
    const isHeading = /^#{1,6}\s/.test(currentLineText);
    const isCodeBlock = textBefore.includes('```') && !textAfter.includes('```');
    const isTable = /\|.*\|/.test(currentLineText);
    const isQuote = /^>\s/.test(currentLineText);
    const isTaskList = /^\s*[-*+]\s\[[ x]\]\s/.test(currentLineText);
    
    let contextHint = '';
    if (isListItem) contextHint = 'Continue the list item naturally.';
    else if (isTaskList) contextHint = 'Complete the task item description.';
    else if (isQuote) contextHint = 'Continue the quote or citation.';
    else if (isHeading) contextHint = 'Complete the heading text.';
    else if (isCodeBlock) contextHint = 'Provide code completion.';
    else if (isTable) contextHint = 'Complete the table cell content.';
    else contextHint = 'Continue the paragraph or sentence naturally.';
    
    const prompt = `You are an intelligent writing assistant for markdown content. 
Provide contextual text completions that:
- Continue the current thought naturally
- Maintain consistent tone and style
- Are concise (max 50 words)
- Respect markdown formatting
- ${contextHint}
- Consider the document structure and theme
- Provide only the completion text, no explanations
- Always provide helpful completion unless the line is already complete

Document structure: ${documentStructure}
Document context summary: "${contextSummary}"
Recent lines: "${recentLines}"
Current line: "${currentLineText}"
Text after cursor: "${textAfter.slice(0, 100)}"
Line ${context.lineNumber || 1}, Column ${context.column || 1}

Provide a natural text completion for the current cursor position. Return only the completion text that would naturally follow:`;

    return prompt;
  }

  private analyzeExtendedContext(textBefore: string, textAfter: string) {
    const lines = textBefore.split('\n');
    const totalLines = lines.length;
    
    // Get recent lines (last 3-5 lines)
    const recentLines = lines.slice(-4, -1).join('\n');
    
    // Analyze document structure
    const headings = lines.filter(line => /^#{1,6}\s/.test(line));
    const listItems = lines.filter(line => /^\s*[-*+]\s/.test(line) || /^\s*\d+\.\s/.test(line));
    const codeBlocks = (textBefore.match(/```/g) || []).length;
    const tables = lines.filter(line => /\|.*\|/.test(line)).length;
    
    let documentStructure = '';
    if (headings.length > 0) documentStructure += `${headings.length} headings, `;
    if (listItems.length > 0) documentStructure += `${listItems.length} list items, `;
    if (codeBlocks > 0) documentStructure += `${Math.floor(codeBlocks/2)} code blocks, `;
    if (tables > 0) documentStructure += `${tables} table rows, `;
    documentStructure = documentStructure.replace(/, $/, '') || 'plain text';
    
    // Generate intelligent context summary
     let contextSummary = '';
     const fullText = lines.join(' ').replace(/\n/g, ' ');
     
     // Detect writing style and tone
     const isTechnical = /\b(API|function|class|method|algorithm|implementation|code|syntax)\b/i.test(fullText);
     const isAcademic = /\b(research|study|analysis|conclusion|hypothesis|methodology)\b/i.test(fullText);
     const isBusiness = /\b(strategy|market|revenue|customer|business|company|product)\b/i.test(fullText);
     const isPersonal = /\b(I think|my opinion|personally|feel|believe|experience)\b/i.test(fullText);
     
     let toneIndicator = '';
     if (isTechnical) toneIndicator = 'Technical/Documentation style. ';
     else if (isAcademic) toneIndicator = 'Academic/Research style. ';
     else if (isBusiness) toneIndicator = 'Business/Professional style. ';
     else if (isPersonal) toneIndicator = 'Personal/Informal style. ';
     
     if (totalLines > 20) {
       // Get key sentences from different parts of the document
       const recentContent = lines.slice(-8, -1).join(' ').replace(/\n/g, ' ');
       
       // Extract main topics from headings and key phrases
       const mainTopics = headings.slice(-3).map(h => h.replace(/^#+\s/, '')).join(', ');
       const keyPhrases = this.extractKeyPhrases(fullText);
       
       contextSummary = `${toneIndicator}Topics: ${mainTopics || keyPhrases}. Current context: ${recentContent.slice(-250)}`;
     } else {
       // For shorter documents, use more of the content
       const recentText = lines.slice(-5, -1).join(' ').replace(/\n/g, ' ');
       contextSummary = `${toneIndicator}${recentText.slice(-300)}`;
     }
    
    return {
      contextSummary: contextSummary.trim(),
      recentLines: recentLines.trim(),
      documentStructure: documentStructure
    };
  }

  private extractKeyPhrases(text: string): string {
    // Remove markdown formatting and clean text
    const cleanText = text
      .replace(/#{1,6}\s/g, '') // Remove heading markers
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
      .replace(/\*([^*]+)\*/g, '$1') // Remove italic
      .replace(/`([^`]+)`/g, '$1') // Remove code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
      .replace(/[^a-zA-Z0-9\s]/g, ' ') // Remove special chars
      .toLowerCase();
    
    // Common stop words to filter out
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'
    ]);
    
    // Extract meaningful phrases (2-3 words)
    const words = cleanText.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
    const phrases: { [key: string]: number } = {};
    
    // Count 2-word phrases
    for (let i = 0; i < words.length - 1; i++) {
      const phrase = `${words[i]} ${words[i + 1]}`;
      phrases[phrase] = (phrases[phrase] || 0) + 1;
    }
    
    // Count 3-word phrases
    for (let i = 0; i < words.length - 2; i++) {
      const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
      phrases[phrase] = (phrases[phrase] || 0) + 1;
    }
    
    // Get top phrases
    const topPhrases = Object.entries(phrases)
      .filter(([phrase, count]) => count > 1 || phrase.length > 10)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([phrase]) => phrase);
    
    return topPhrases.join(', ') || 'general content';
  }

  private extractSuggestions(response: string): string[] {
    if (!response || response.trim() === 'NO_COMPLETION' || response.trim() === '') {
      return [];
    }

    // Clean up the response more thoroughly
    let cleaned = response.trim()
      .replace(/^["'`]|["'`]$/g, '') // Remove quotes
      .replace(/^(Completion:|Suggestion:|Text:|Continue:|Response:)\s*/i, '') // Remove prefixes
      .replace(/\n\s*$/, '') // Remove trailing newlines
      .replace(/^\s*[-*+]\s*/, '') // Remove leading list markers
      .replace(/^\s*\d+\.\s*/, ''); // Remove leading numbers
    
    // Handle special cases and clean formatting
    if (cleaned.includes('NO_COMPLETION')) {
      return [];
    }
    
    // Split by common delimiters if multiple suggestions
    const suggestions = cleaned
      .split(/\n\n|\n---|\n\d+\.|\n-\s|\n\*\s/)
      .map(s => s.trim())
      .filter(s => {
        return s.length > 0 && 
               s !== 'NO_COMPLETION' && 
               s.length <= 250 && // Increased limit for better context
               s.length >= 2 && // Minimum meaningful length
               !s.includes('I cannot') &&
               !s.includes('I can\'t') &&
               !s.includes('As an AI') &&
               !s.includes('I\'m sorry') &&
               !/^(Sorry|Unfortunately|I don\'t)/i.test(s);
      })
      .slice(0, 3); // Max 3 suggestions

    // If no valid suggestions found but we have cleaned text, try to use it
    if (suggestions.length === 0 && cleaned.length > 2 && cleaned.length <= 250) {
      return [cleaned];
    }

    return suggestions;
  }

  async getSuggestions(context: AutoCompleteContext): Promise<AutoCompleteResponse> {
    if (!this.isInitialized()) {
      return {
        success: false,
        suggestions: [],
        error: 'AutoComplete service not initialized'
      };
    }

    // Check minimum context length
    const textBefore = context.textBeforeCursor || context.contextBefore || '';
    if (textBefore.length < 5) {
      return {
        success: false,
        suggestions: [],
        error: 'Insufficient context for suggestions'
      };
    }

    // Check rate limit
    if (!this.checkRateLimit()) {
      return {
        success: false,
        suggestions: [],
        error: 'Rate limit exceeded. Please wait before requesting more suggestions.'
      };
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(context);
    const cachedSuggestions = this.getCachedSuggestions(cacheKey);
    if (cachedSuggestions) {
      return {
        success: true,
        suggestions: cachedSuggestions
      };
    }

    // Cancel previous request if any
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    try {
      const prompt = this.buildPrompt(context);
      console.log('🤖 AutoComplete: Requesting suggestions...', { contextLength: context.textBeforeCursor.length });
      
      const result = await this.genAI!.models.generateContent({
        model: this.modelName,
        contents: prompt,
        generationConfig: {
          maxOutputTokens: 100,
          temperature: 0.7,
          topP: 0.8,
          topK: 40
        }
      });
      
      const text = result.text;
      
      const suggestions = this.extractSuggestions(text);
      console.log('✅ AutoComplete: Received suggestions:', { count: suggestions.length });
      
      // Cache the results
      this.setCachedSuggestions(cacheKey, suggestions);
      
      return {
        success: true,
        suggestions
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          suggestions: [],
          error: 'Request cancelled'
        };
      }
      
      console.error('❌ AutoComplete: Error getting suggestions:', error);
      return {
        success: false,
        suggestions: [],
        error: error.message || 'Failed to get suggestions'
      };
    }
  }

  async *streamSuggestions(context: AutoCompleteContext): AsyncGenerator<string, void, unknown> {
    if (!this.isInitialized()) {
      throw new Error('AutoComplete service not initialized');
    }

    // Check rate limit
    if (!this.checkRateLimit()) {
      throw new Error('Rate limit exceeded');
    }

    // Cancel previous request if any
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    try {
      const prompt = this.buildPrompt(context);
      console.log('🌊 AutoComplete: Starting streaming suggestions...');
      
      const result = await this.genAI!.models.generateContentStream({
        model: this.modelName,
        contents: prompt,
        generationConfig: {
          maxOutputTokens: 100,
          temperature: 0.7,
          topP: 0.8,
          topK: 40
        }
      });
      
      let accumulatedText = '';
      for await (const chunk of result) {
        const chunkText = chunk.text;
        accumulatedText += chunkText;
        
        // Clean and validate accumulated text
        const cleanedText = accumulatedText.trim()
          .replace(/^["'`]|["'`]$/g, '')
          .replace(/^(Completion:|Suggestion:|Text:|Continue:|Response:)\s*/i, '')
          .replace(/^\s*[-*+]\s*/, '')
          .replace(/^\s*\d+\.\s*/, '');
        
        // Yield progressive suggestions if valid
        if (cleanedText && 
            cleanedText !== 'NO_COMPLETION' && 
            !cleanedText.includes('NO_COMPLETION') &&
            cleanedText.length >= 2 &&
            !cleanedText.includes('I cannot') &&
            !cleanedText.includes('As an AI')) {
          yield cleanedText;
        }
      }
      
      console.log('✅ AutoComplete: Streaming completed');
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('🛑 AutoComplete: Streaming cancelled');
        return;
      }
      
      console.error('❌ AutoComplete: Streaming error:', error);
      throw error;
    }
  }

  cancelCurrentRequest(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE
    };
  }
}

const autoCompleteService = new AutoCompleteService();
export default autoCompleteService;