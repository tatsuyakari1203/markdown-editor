import { DocumentAnalysis, ContentComplexity, SemanticContext, ContextWindow, ChunkContext, TextChunk, GenerationParameters } from './gemini/types';

export class PromptBuilder {
  buildReformatPrompt(content: string, context?: ChunkContext): string {
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

  buildOptimizedRewritePrompt(
    content: string,
    prompt: string,
    documentAnalysis: DocumentAnalysis,
    contentComplexity: ContentComplexity,
    semanticContext: SemanticContext,
    contextWindow: ContextWindow,
    fullDocument?: string,
    beforeText?: string,
    afterText?: string
  ): string {
    const styleDescription = this.describeWritingStyle(documentAnalysis.styleMetrics);
    const contextDescription = this.buildContextDescription(semanticContext, documentAnalysis);
    const complexityGuidance = this.buildComplexityGuidance(contentComplexity);
    
    let contextSection = '';
    if (beforeText || afterText || fullDocument) {
      contextSection = `\n\nDOCUMENT CONTEXT:\n`;
      
      if (fullDocument && fullDocument !== content) {
        const docStructure = this.extractDocumentStructure(fullDocument);
        contextSection += `Document Structure: ${docStructure}\n`;
      }
      
      if (beforeText) {
        contextSection += `\nPRECEDING CONTENT:\n${beforeText}\n`;
      }
      
      if (afterText) {
        contextSection += `\nFOLLOWING CONTENT:\n${afterText}\n`;
      }
      
      if (semanticContext.relatedSections.length > 0) {
        contextSection += `\nRELATED SECTIONS: ${semanticContext.relatedSections.join(', ')}\n`;
      }
      
      if (Object.keys(semanticContext.terminologyMap).length > 0) {
        const keyTerms = Object.entries(semanticContext.terminologyMap)
          .slice(0, 5)
          .map(([term, count]) => `${term} (${count})`)
          .join(', ');
        contextSection += `\nKEY TERMINOLOGY: ${keyTerms}\n`;
      }
    }

    return `You are an expert content writer and editor with deep knowledge of ${documentAnalysis.dominantType} writing. ${contextDescription}${contextSection}

WRITING STYLE REQUIREMENTS:
- Maintain ${styleDescription} tone and style
- Technical density level: ${contentComplexity.technicalTermRatio > 0.1 ? 'High' : 'Moderate'}
- Readability target: ${documentAnalysis.styleMetrics.readabilityLevel}
- Formality level: ${documentAnalysis.styleMetrics.formalityScore > 50 ? 'Formal' : 'Conversational'}

${complexityGuidance}

CONTENT TO REWRITE:
${content}

USER REQUEST:
${prompt}

Please rewrite the content according to the user's request while maintaining consistency with the document's style and context.`;
  }

  buildChunkRewritePrompt(
    chunk: TextChunk,
    prompt: string,
    context: ChunkContext,
    enhancedContext: any,
    position: number,
    total: number
  ): string {
    const chunkContext = this.buildChunkRewriteContext(chunk, enhancedContext, position, total);
    
    return `You are rewriting chunk ${position + 1} of ${total} chunks. ${chunkContext.chunkSpecificContext}

${chunkContext.maintainConsistency ? 'CONSISTENCY REQUIREMENTS:\n- Maintain consistent tone and style with previous chunks\n- Ensure smooth transitions\n- Preserve terminology and formatting patterns\n\n' : ''}

CHUNK CONTEXT:
- Document structure: ${context.documentStructure}
- Style guide: ${context.styleGuide}
- Preceding content: ${context.precedingContent}
- Following preview: ${context.followingPreview}

CONTENT TO REWRITE:
${chunk.content}

USER REQUEST:
${prompt}

Rewrite this chunk according to the request while maintaining document consistency.`;
  }

  private describeWritingStyle(styleMetrics: any): string {
    if (!styleMetrics) return 'Standard';
    
    const { averageSentenceLength, formalityScore, technicalDensity, readabilityLevel } = styleMetrics;
    
    let style = '';
    if (formalityScore > 50) style += 'Formal, ';
    if (technicalDensity > 0.1) style += 'Technical, ';
    if (averageSentenceLength > 20) style += 'Complex, ';
    
    style += readabilityLevel || 'Standard';
    
    return style.replace(/, $/, '');
  }

  private buildContextDescription(semanticContext: SemanticContext, documentAnalysis: DocumentAnalysis): string {
    let description = '';
    
    if (documentAnalysis.dominantType) {
      description += `This is primarily ${documentAnalysis.dominantType} content. `;
    }
    
    if (semanticContext.keywords.length > 0) {
      description += `Key topics include: ${semanticContext.keywords.slice(0, 5).join(', ')}. `;
    }
    
    if (semanticContext.dependencies.length > 0) {
      description += `This content references: ${semanticContext.dependencies.slice(0, 3).join(', ')}. `;
    }
    
    return description;
  }

  private buildComplexityGuidance(contentComplexity: ContentComplexity): string {
    let guidance = 'CONTENT COMPLEXITY GUIDANCE:\n';
    
    if (contentComplexity.codeBlockRatio > 0.1) {
      guidance += '- Preserve all code blocks and syntax highlighting\n';
      guidance += '- Maintain proper indentation and formatting in code\n';
    }
    
    if (contentComplexity.mathContentRatio > 0.05) {
      guidance += '- Preserve mathematical notation and LaTeX formatting\n';
      guidance += '- Ensure proper KaTeX syntax for equations\n';
    }
    
    if (contentComplexity.tableRatio > 0.05) {
      guidance += '- Maintain table structure and alignment\n';
      guidance += '- Preserve data relationships in tables\n';
    }
    
    if (contentComplexity.listRatio > 0.1) {
      guidance += '- Preserve list hierarchy and numbering\n';
      guidance += '- Maintain consistent list formatting\n';
    }
    
    if (contentComplexity.linkRatio > 0.05) {
      guidance += '- Preserve all links and references\n';
      guidance += '- Maintain link text and URLs\n';
    }
    
    return guidance;
  }

  private extractDocumentStructure(fullDocument: string): string {
    const headings = fullDocument.match(/^#{1,6}\s+.+$/gm) || [];
    const structure = headings.slice(0, 5).map(h => {
      const level = h.match(/^#+/)?.[0].length || 1;
      const text = h.replace(/^#+\s*/, '').trim();
      return `${'  '.repeat(level - 1)}${text}`;
    }).join('\n');
    
    return structure || 'No clear structure detected';
  }

  private buildChunkRewriteContext(chunk: TextChunk, enhancedContext: any, position: number, total: number) {
    return {
      chunkSpecificContext: `Chunk ${position + 1}/${total}: ${chunk.type} content`,
      maintainConsistency: position > 0,
      isFirstChunk: position === 0,
      isLastChunk: position === total - 1
    };
  }

  optimizeGenerationParameters(
    documentAnalysis: DocumentAnalysis,
    contentComplexity: ContentComplexity,
    prompt: string
  ): GenerationParameters {
    // Base parameters
    let temperature = 0.3;
    let topK = 40;
    let topP = 0.8;
    let outputTokens = 8192;
    
    // Adjust based on content type
    if (documentAnalysis.dominantType === 'technical') {
      temperature = 0.2; // More deterministic for technical content
      topK = 20;
      topP = 0.7;
    } else if (documentAnalysis.dominantType === 'creative') {
      temperature = 0.5; // More creative for creative content
      topK = 60;
      topP = 0.9;
    }
    
    // Adjust based on complexity
    if (contentComplexity.codeBlockRatio > 0.2) {
      temperature = Math.max(0.1, temperature - 0.1); // Very deterministic for code
    }
    
    if (contentComplexity.mathContentRatio > 0.1) {
      temperature = Math.max(0.1, temperature - 0.1); // Precise for math
    }
    
    // Adjust output tokens based on content length and complexity
    const complexityFactor = 1 + (contentComplexity.codeBlockRatio + contentComplexity.mathContentRatio) * 0.5;
    outputTokens = Math.min(32768, Math.floor(outputTokens * complexityFactor));
    
    // Adjust based on prompt type
    if (prompt.toLowerCase().includes('creative') || prompt.toLowerCase().includes('rewrite')) {
      temperature += 0.1;
      topP += 0.1;
    }
    
    if (prompt.toLowerCase().includes('fix') || prompt.toLowerCase().includes('correct')) {
      temperature = Math.max(0.1, temperature - 0.1);
    }
    
    return {
      optimalTemperature: Math.min(1.0, Math.max(0.1, temperature)),
      optimalTopK: Math.min(100, Math.max(1, topK)),
      optimalTopP: Math.min(1.0, Math.max(0.1, topP)),
      optimalOutputTokens: outputTokens
    };
  }
}