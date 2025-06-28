import { GoogleGenAI } from '@google/genai';

export interface GeminiConfig {
  apiKey: string;
  model?: string;
}

export interface ReformatResponse {
  success: boolean;
  content: string;
  error?: string;
}

export interface RewriteResponse {
  success: boolean;
  content: string;
  error?: string;
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

  async reformatMarkdown(content: string): Promise<ReformatResponse> {
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
      const prompt = `You are an expert markdown and code formatting specialist. Your task is to clean up and beautify markdown content while preserving ALL original content and meaning.

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
9. Maintain the original language and tone
10. Return ONLY the cleaned markdown, no explanations

Content to reformat:
\`\`\`markdown
${content}
\`\`\`

Cleaned content:`;

      const response = await this.genAI.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          temperature: 0.1,
          topK: 1,
          topP: 0.8,
          maxOutputTokens: 8192,
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



  async rewriteContent(content: string, prompt: string): Promise<RewriteResponse> {
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
      const fullPrompt = `You are an expert content rewriting assistant. Rewrite the given content according to the user's specific instructions while maintaining proper markdown formatting and structure.

User instructions: ${prompt}

IMPORTANT GUIDELINES:
1. Follow the user's instructions precisely
2. Maintain markdown formatting and structure
3. Preserve code blocks, links, and special formatting
4. Ensure the rewritten content flows naturally
5. Keep the same general length unless instructed otherwise
6. Return only the rewritten markdown content, no explanations

Content to rewrite:
\`\`\`markdown
${content}
\`\`\`

Rewritten content:`;

      const response = await this.genAI.models.generateContent({
        model: this.modelName,
        contents: fullPrompt,
        config: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
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

  isInitialized(): boolean {
    return this.genAI !== null;
  }
}

export const geminiService = new GeminiService();
export default geminiService;