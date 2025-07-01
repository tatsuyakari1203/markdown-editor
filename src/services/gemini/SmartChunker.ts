import { TextChunk, ChunkingConfig, ChunkContext } from './types';

/**
 * Smart Chunker for handling long texts
 * Intelligently splits content while preserving markdown structure
 */
export class SmartChunker {
  private readonly DEFAULT_CONFIG: ChunkingConfig = {
    maxChunkSize: 15000, // characters
    overlapSize: 500,
    preserveStructure: true,
    maxOutputTokens: 32768
  };

  /**
   * Chunks text into smaller pieces while preserving structure
   * @param content - The content to chunk
   * @param config - Optional chunking configuration
   * @returns Array of text chunks
   */
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

  /**
   * Detects the primary content type of a chunk
   * @param content - The content to analyze
   * @returns The detected content type
   */
  private detectContentType(content: string): TextChunk['type'] {
    const lines = content.trim().split('\n');
    
    if (lines.some(line => line.match(/^#{1,6}\s/))) return 'heading';
    if (lines.some(line => line.match(/^```/))) return 'code';
    if (lines.some(line => line.match(/^[-*+]\s|^\d+\.\s/))) return 'list';
    if (lines.some(line => line.match(/^\|.*\|/))) return 'table';
    if (lines.length === 1 || lines.every(line => !line.trim() || line.length < 100)) return 'paragraph';
    
    return 'mixed';
  }

  /**
   * Determines if a break should occur at the current position
   * @param line - Current line
   * @param nextLine - Next line
   * @param inCodeBlock - Whether currently in a code block
   * @param inTable - Whether currently in a table
   * @param lineIndex - Current line index
   * @param lines - All lines
   * @returns Whether to break here
   */
  private shouldBreakHere(
    line: string, 
    nextLine: string, 
    inCodeBlock: boolean, 
    inTable: boolean, 
    lineIndex: number, 
    lines: string[]
  ): boolean {
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
  
  /**
   * Finds the optimal break point for chunking
   * @param lines - All lines
   * @param currentIndex - Current line index
   * @param startLine - Start line of current chunk
   * @param inCodeBlock - Whether in code block
   * @param inTable - Whether in table
   * @returns Optimal break point index
   */
  private findOptimalBreakPoint(
    lines: string[], 
    currentIndex: number, 
    startLine: number, 
    inCodeBlock: boolean, 
    inTable: boolean
  ): number {
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
  
  /**
   * Creates intelligent overlap between chunks
   * @param lines - All lines
   * @param breakPoint - Break point index
   * @param overlapSize - Desired overlap size
   * @returns Overlap content and metadata
   */
  private createIntelligentOverlap(
    lines: string[], 
    breakPoint: number, 
    overlapSize: number
  ): { content: string; startLine: number; inCodeBlock: boolean } {
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

  /**
   * Builds context information for a chunk
   * @param chunk - The text chunk
   * @param originalContent - The original full content
   * @returns Chunk context information
   */
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

  /**
   * Extracts document structure (headings)
   * @param content - The content to analyze
   * @returns Document structure summary
   */
  private extractDocumentStructure(content: string): string {
    const headings = content.match(/^#{1,6}\s.+$/gm) || [];
    return headings.slice(0, 10).join('; ');
  }

  /**
   * Extracts style guide information
   * @param content - The content to analyze
   * @returns Style guide summary
   */
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