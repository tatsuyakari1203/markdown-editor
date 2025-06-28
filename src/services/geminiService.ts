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
      const prompt = `You are an expert markdown and code formatting specialist with advanced knowledge of mathematical notation and KaTeX. Your task is to clean up and beautify markdown content while preserving ALL original content and meaning.

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

  isInitialized(): boolean {
    return this.genAI !== null;
  }
}

export const geminiService = new GeminiService();
export default geminiService;