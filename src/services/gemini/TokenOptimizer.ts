import { ContentComplexity } from './types';

/**
 * Token Optimizer for efficient processing
 * Handles token estimation, chunk size optimization, and content complexity analysis
 */
export class TokenOptimizer {
  private readonly TOKEN_LIMITS = {
    input: 1048576, // 1M tokens for Gemini 2.5 Flash
    output: 65535,  // Default output limit
    recommended: 32768 // Recommended for better performance
  };

  /**
   * Estimates the number of tokens in a text
   * @param text - The text to analyze
   * @returns Estimated token count
   */
  estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English
    // More conservative for mixed content
    return Math.ceil(text.length / 3.5);
  }

  /**
   * Optimizes chunk size based on content type and target output tokens
   * @param content - The content to analyze
   * @param targetOutputTokens - Target number of output tokens
   * @returns Optimal chunk size in characters
   */
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
  
  /**
   * Analyzes content complexity to determine processing strategy
   * @param content - The content to analyze
   * @returns Content complexity metrics
   */
  analyzeContentComplexity(content: string): ContentComplexity {
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

  /**
   * Validates if the input and expected output fit within token limits
   * @param inputText - The input text
   * @param expectedOutputTokens - Expected output token count
   * @returns Whether the limits are valid
   */
  validateTokenLimits(inputText: string, expectedOutputTokens: number): boolean {
    const inputTokens = this.estimateTokens(inputText);
    return inputTokens <= this.TOKEN_LIMITS.input && 
           expectedOutputTokens <= this.TOKEN_LIMITS.output;
  }

  /**
   * Gets the optimal output token limit based on chunk size
   * @param chunkSize - The chunk size in characters
   * @returns Optimal output token limit
   */
  getOptimalOutputTokenLimit(chunkSize: number): number {
    const inputTokens = this.estimateTokens('x'.repeat(chunkSize));
    const availableOutput = Math.min(
      this.TOKEN_LIMITS.recommended,
      Math.floor((this.TOKEN_LIMITS.input - inputTokens) * 0.3)
    );
    
    return Math.max(8192, availableOutput);
  }

  /**
   * Determines if chunking should be used based on content analysis
   * @param content - The content to analyze
   * @param estimatedTokens - Estimated token count
   * @param contentAnalysis - Content complexity analysis
   * @returns Whether chunking should be used
   */
  shouldUseChunking(
    content: string, 
    estimatedTokens: number, 
    contentAnalysis: ContentComplexity
  ): boolean {
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
}