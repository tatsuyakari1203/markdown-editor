import { GoogleGenerativeAI } from '@google/generative-ai';
import { SmartChunker } from './SmartChunker';
import { TokenOptimizer } from './TokenOptimizer';
import { PromptBuilder } from '../PromptBuilder';
import { DocumentAnalyzer } from '../DocumentAnalyzer';
import {
  ReformatResponse,
  RewriteResponse,
  ChunkContext,
  DocumentAnalysis,
  ContentComplexity,
  SemanticContext,
  ContextWindow,
  EnhancedRewriteContext
} from './types';

export interface RewriteOptions {
  useChunking?: boolean;
  maxChunkSize?: number;
  preserveFormatting?: boolean;
  enhanceContext?: boolean;
}

export class ContentProcessor {
  constructor(
    private smartChunker: SmartChunker,
    private tokenOptimizer: TokenOptimizer,
    private promptBuilder: PromptBuilder,
    private documentAnalyzer: DocumentAnalyzer,
    private genAI: GoogleGenerativeAI
  ) {}

  async reformatMarkdown(
    content: string,
    onProgress?: (progress: number) => void
  ): Promise<ReformatResponse> {
    try {
      const contentComplexity = this.documentAnalyzer.analyzeContentComplexity(content);
      const shouldChunk = this.shouldUseChunking(content, contentComplexity);

      if (shouldChunk) {
        return await this.reformatWithChunking(content, onProgress);
      } else {
        const reformattedContent = await this.reformatSingleChunk(content);
        return {
          content: reformattedContent,
          success: true,
          chunksProcessed: 1,
          totalChunks: 1
        };
      }
    } catch (error) {
      return {
        content: content,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        chunksProcessed: 0,
        totalChunks: 1
      };
    }
  }

  async rewriteContent(
    content: string,
    prompt: string,
    options: RewriteOptions = {},
    onProgress?: (progress: number) => void
  ): Promise<RewriteResponse> {
    try {
      const documentAnalysis = this.documentAnalyzer.analyzeDocument(content);
      const contentComplexity = this.documentAnalyzer.analyzeContentComplexity(content);
      const semanticContext = this.documentAnalyzer.extractSemanticContext(content);
      const contextWindow = this.documentAnalyzer.analyzeContextWindow(content);

      const enhancedContext: EnhancedRewriteContext = {
        documentAnalysis,
        contentComplexity,
        semanticContext,
        contextWindow,
        options
      };

      const shouldChunk = options.useChunking ?? this.shouldUseChunking(content, contentComplexity);

      if (shouldChunk) {
        return await this.rewriteWithChunking(content, prompt, enhancedContext, onProgress);
      } else {
        const optimizedPrompt = this.promptBuilder.buildOptimizedRewritePrompt(
          content,
          prompt,
          documentAnalysis,
          contentComplexity,
          semanticContext,
          contextWindow
        );

        const generationParams = this.promptBuilder.optimizeGenerationParameters(
          documentAnalysis,
          contentComplexity,
          'rewrite'
        );

        const response = await this.genAI.generateContent({
          contents: [{ role: 'user', parts: [{ text: optimizedPrompt }] }],
          generationConfig: generationParams
        });

        const rewrittenContent = this.cleanAndValidateMarkdownResponse(response.response.text());

        return {
          content: rewrittenContent,
          success: true,
          chunksProcessed: 1,
          totalChunks: 1,
          enhancedContext
        };
      }
    } catch (error) {
      return {
        content: content,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        chunksProcessed: 0,
        totalChunks: 1
      };
    }
  }

  private async reformatSingleChunk(content: string, context?: ChunkContext): Promise<string> {
    const prompt = this.promptBuilder.buildReformatPrompt(content, context);
    const response = await this.genAI.generateContent(prompt);
    
    // Clean and validate the response to ensure proper markdown format
    return this.cleanAndValidateMarkdownResponse(response.response.text());
  }

  private async reformatWithChunking(
    content: string,
    onProgress?: (progress: number) => void
  ): Promise<ReformatResponse> {
    const chunks = this.smartChunker.chunkContent(content);
    const reformattedChunks: string[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const context = this.smartChunker.buildChunkContext(chunk, chunks, i, content);
      
      const reformattedChunk = await this.reformatSingleChunk(chunk.content, context);
      reformattedChunks.push(reformattedChunk);
      
      if (onProgress) {
        onProgress((i + 1) / chunks.length);
      }
    }
    
    return {
      content: reformattedChunks.join('\n\n'),
      success: true,
      chunksProcessed: chunks.length,
      totalChunks: chunks.length
    };
  }

  private async rewriteWithChunking(
    content: string,
    prompt: string,
    enhancedContext: EnhancedRewriteContext,
    onProgress?: (progress: number) => void
  ): Promise<RewriteResponse> {
    const chunks = this.smartChunker.chunkContent(content);
    const rewrittenChunks: string[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const context = this.smartChunker.buildChunkContext(chunk, chunks, i, content);
      
      const chunkPrompt = this.promptBuilder.buildChunkRewritePrompt(
        chunk,
        prompt,
        context,
        enhancedContext,
        i,
        chunks.length
      );
      
      const response = await this.genAI.generateContent(chunkPrompt);
      const rewrittenChunk = this.cleanAndValidateMarkdownResponse(response.response.text());
      rewrittenChunks.push(rewrittenChunk);
      
      if (onProgress) {
        onProgress((i + 1) / chunks.length);
      }
    }
    
    return {
      content: rewrittenChunks.join('\n\n'),
      success: true,
      chunksProcessed: chunks.length,
      totalChunks: chunks.length,
      enhancedContext
    };
  }

  private shouldUseChunking(content: string, contentComplexity: ContentComplexity): boolean {
    const tokenCount = this.tokenOptimizer.estimateTokens(content);
    const complexityScore = this.calculateComplexityScore(contentComplexity);
    
    return tokenCount > 3000 || complexityScore > 0.7;
  }

  private calculateComplexityScore(complexity: ContentComplexity): number {
    return (
      complexity.codeRatio * 0.3 +
      complexity.mathRatio * 0.3 +
      complexity.tableRatio * 0.2 +
      complexity.listRatio * 0.1 +
      complexity.technicalTermRatio * 0.1
    );
  }

  private cleanAndValidateMarkdownResponse(response: string): string {
    // Remove markdown code block wrappers if present
    let cleanedResponse = response.trim();
    
    // Remove various code block patterns
    const codeBlockPatterns = [
      /^```(?:markdown|md)?\s*\n?([\s\S]*?)\n?```$/,
      /^`([\s\S]*?)`$/,
      /^"([\s\S]*?)"$/
    ];
    
    for (const pattern of codeBlockPatterns) {
      const match = cleanedResponse.match(pattern);
      if (match) {
        cleanedResponse = match[1].trim();
        break;
      }
    }
    
    // Remove any leading/trailing explanatory text
    cleanedResponse = this.removeExplanatoryText(cleanedResponse);
    
    // Validate and fix common markdown issues
    cleanedResponse = this.validateMarkdownFormat(cleanedResponse);
    
    return cleanedResponse;
  }
  
  private removeExplanatoryText(response: string): string {
    // Remove common explanatory phrases that might be added by AI
    const explanatoryPatterns = [
      /^(?:Here's the|Here is the|The)\s+(?:cleaned|formatted|rewritten|improved)\s+(?:content|markdown|version):\s*/i,
      /^(?:Cleaned|Formatted|Rewritten|Improved)\s+(?:content|markdown|version):\s*/i,
      /^(?:Output|Result):\s*/i,
      /\n\n(?:This|The above)\s+(?:content|markdown)\s+(?:has been|is)\s+(?:cleaned|formatted|rewritten|improved).*$/i
    ];
    
    let cleaned = response;
    for (const pattern of explanatoryPatterns) {
      cleaned = cleaned.replace(pattern, '');
    }
    
    return cleaned.trim();
  }
  
  private validateMarkdownFormat(content: string): string {
    let validated = content;
    
    // Fix common KaTeX formatting issues
    validated = this.fixKaTeXFormatting(validated);
    
    // Fix common markdown syntax issues
    validated = this.fixMarkdownSyntax(validated);
    
    return validated;
  }
  
  private fixKaTeXFormatting(content: string): string {
    let fixed = content;
    
    // Fix escaped dollar signs that should be KaTeX delimiters
    fixed = fixed.replace(/\\\$/g, '$');
    
    // Remove the problematic regex that incorrectly processes KaTeX expressions
    // The original regex was causing corruption of valid math expressions
    
    // Ensure proper spacing around inline math (but not too aggressive)
    fixed = fixed.replace(/(\w)\$([^$]+?)\$(\w)/g, '$1 $$$2$$ $3');
    
    // Fix display math formatting - preserve line breaks for complex expressions
    fixed = fixed.replace(/\$\$\s*\n\s*([\s\S]*?)\s*\n\s*\$\$/g, (match, mathContent) => {
      // Clean up excessive whitespace but preserve intentional line breaks
      const cleaned = mathContent.replace(/\n\s*\n/g, '\n').trim();
      return '$$\n' + cleaned + '\n$$';
    });
    
    // Fix matrix formatting
    fixed = fixed.replace(/\\begin\{(p|b|v|V|B)matrix\}([\s\S]*?)\\end\{\1matrix\}/g, (match, type, content) => {
      // Clean up matrix content spacing
      const cleanContent = content.replace(/\s*\\\\\s*/g, ' \\\\ ').replace(/\s*&\s*/g, ' & ').trim();
      return `\\begin{${type}matrix}\n${cleanContent}\n\\end{${type}matrix}`;
    });
    
    // Fix fraction formatting
    fixed = fixed.replace(/\\frac\s*\{([^}]*)\}\s*\{([^}]*)\}/g, '\\frac{$1}{$2}');
    
    // Fix integral limits formatting
    fixed = fixed.replace(/\\int\s*_\s*\{([^}]*)\}\s*\^\s*\{([^}]*)\}/g, '\\int_{$1}^{$2}');
    fixed = fixed.replace(/\\int\s*_\s*([^\s{])\s*\^\s*([^\s{])/g, '\\int_$1^$2');
    
    // Fix summation and product limits
    fixed = fixed.replace(/\\(sum|prod)\s*_\s*\{([^}]*)\}\s*\^\s*\{([^}]*)\}/g, '\\$1_{$2}^{$3}');
    
    // Fix limit expressions
    fixed = fixed.replace(/\\lim\s*_\s*\{([^}]*)\}/g, '\\lim_{$1}');
    
    // Fix modular arithmetic
    fixed = fixed.replace(/\\pmod\s*\{([^}]*)\}/g, '\\pmod{$1}');
    
    // Fix binomial coefficients
    fixed = fixed.replace(/\{([^}]*)\s*\\choose\s*([^}]*)\}/g, '{$1 \\choose $2}');
    
    // Fix vector notation
    fixed = fixed.replace(/\\mathbf\s*\{([^}]*)\}/g, '\\mathbf{$1}');
    fixed = fixed.replace(/\\vec\s*\{([^}]*)\}/g, '\\vec{$1}');
    
    // Fix Greek letters spacing
    fixed = fixed.replace(/\\(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega)([a-zA-Z])/g, '\\$1 $2');
    
    // Fix function spacing
    fixed = fixed.replace(/\\(sin|cos|tan|log|ln|exp|lim|max|min|sup|inf)([a-zA-Z(])/g, '\\$1 $2');
    
    // Fix bracket sizing
    fixed = fixed.replace(/\\left\s*([()\[\]{}|])/g, '\\left$1');
    fixed = fixed.replace(/\\right\s*([()\[\]{}|])/g, '\\right$1');
    
    // Fix spacing around operators
    fixed = fixed.replace(/([^\\])\s*(\\times|\\div|\\pm|\\mp|\\cdot|\\ast|\\star|\\circ|\\bullet|\\equiv)\s*/g, '$1 $2 ');
    
    return fixed;
  }
  
  private fixMarkdownSyntax(content: string): string {
    let fixed = content;
    
    // Fix header spacing
    fixed = fixed.replace(/^(#{1,6})([^\s#])/gm, '$1 $2');
    
    // Fix list formatting
    fixed = fixed.replace(/^(\d+)\.(\S)/gm, '$1. $2');
    fixed = fixed.replace(/^([*+-])(\S)/gm, '$1 $2');
    
    // Fix emphasis formatting
    fixed = fixed.replace(/\*\*(\S[^*]*?\S)\*\*/g, '**$1**');
    fixed = fixed.replace(/\*(\S[^*]*?\S)\*/g, '*$1*');
    
    // Fix code block language specification
    fixed = fixed.replace(/^```(\w+)\s*$/gm, '```$1');
    
    // Fix table formatting
    fixed = fixed.replace(/\|([^|\n]+?)\|/g, (match, content) => {
      return '| ' + content.trim() + ' |';
    });
    
    return fixed;
  }
}