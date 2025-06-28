import { GoogleGenerativeAI } from '@google/generative-ai';

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
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

  initialize(config: GeminiConfig) {
    try {
      this.genAI = new GoogleGenerativeAI(config.apiKey);
      this.model = this.genAI.getGenerativeModel({ 
        model: config.model || 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 0.8,
          maxOutputTokens: 8192,
        },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async reformatMarkdown(content: string): Promise<ReformatResponse> {
    if (!this.model) {
      return {
        success: false,
        content: '',
        error: 'Gemini service not initialized. Please check your API key.'
      };
    }

    try {
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

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 0.8,
        }
      });

      const response = await result.response;
      const reformattedContent = response.text().trim();

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
      return {
        success: false,
        content: '',
        error: error.message || 'Failed to reformat content'
      };
    }
  }



  async rewriteContent(content: string, prompt: string): Promise<RewriteResponse> {
    if (!this.model) {
      return {
        success: false,
        content: '',
        error: 'Gemini service not initialized. Please check your API key.'
      };
    }

    try {
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

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
        }
      });

      const response = await result.response;
      const rewrittenContent = response.text().trim();

      // Remove markdown code block wrapper if present
      const cleanContent = rewrittenContent
        .replace(/^```markdown\s*\n/, '')
        .replace(/\n```$/, '')
        .replace(/^```\s*\n/, '')
        .replace(/\n```$/, '');

      return {
        success: true,
        content: cleanContent
      };
    } catch (error: any) {
      return {
        success: false,
        content: '',
        error: error.message || 'Failed to rewrite content'
      };
    }
  }

  isInitialized(): boolean {
    return this.model !== null;
  }
}

export const geminiService = new GeminiService();
export default geminiService;