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

    return `You are an expert technical document formatter and syntax correction engine. Your sole purpose is to clean up and standardize the formatting of the provided text based on a strict set of rules.${contextInfo}

CRITICAL RULE: You MUST NOT alter, add, or remove any of the original content or its meaning. Your only job is to fix syntax and formatting.

MARKDOWN FORMATTING RULES:
1. Headers: Ensure proper spacing (# Header, ## Subheader) with single space after #
2. Emphasis: Fix bold (**text**) and italic (*text*) formatting
3. Lists: Standardize bullet points (-) and numbering (1.) with proper spacing
4. Links: Ensure proper format [text](url) and fix broken syntax
5. Images: Ensure proper format ![alt](src) with descriptive alt text
6. Tables: Fix alignment, spacing, and ensure proper pipe (|) separation
7. Blockquotes: Ensure proper > formatting with consistent spacing
8. Horizontal rules: Standardize to --- format
9. Line breaks: Use proper double line breaks for paragraphs

CODE BLOCK RULES:
10. Code blocks: Ensure proper \`\`\`language syntax with language specification
11. Inline code: Use single backticks \`code\` for inline code
12. Indentation: Fix proper indentation within code blocks
13. Syntax highlighting: Specify correct language for code blocks

KATEX MATHEMATICAL RULES:
14. Inline math: Use single dollar signs $equation$ for inline mathematics
15. Display math: Use double dollar signs $$equation$$ for block mathematics
16. Fractions: Ensure proper \\frac{numerator}{denominator} format
17. Superscripts: Use ^{} for exponents (x^{2}, e^{-x})
18. Subscripts: Use _{} for subscripts (x_{1}, H_{2}O)
19. Greek letters: Use proper LaTeX commands (\\alpha, \\beta, \\gamma, etc.)
20. Mathematical operators: Use proper symbols (\\times, \\div, \\pm, \\cdot)
21. Functions: Use proper formatting (\\sin, \\cos, \\log, \\lim)
22. Matrices: Use proper \\begin{pmatrix} format
23. Integrals: Use \\int with proper limits
24. Summations: Use \\sum_{i=1}^{n} format
25. Square roots: Use \\sqrt{} format
26. Brackets: Use \\left( \\right) for auto-sizing

WHITESPACE & CLEANUP RULES:
27. Remove extra blank lines (max 2 consecutive)
28. Standardize spacing around punctuation
29. Fix merged/concatenated words
30. Remove HTML comments
31. Ensure consistent formatting throughout

OUTPUT REQUIREMENTS:
- Return ONLY the cleaned markdown content
- NO explanations, comments, or additional text
- Ensure the output is valid, well-formatted markdown
- Preserve all original meaning and information

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
    const markdownGuidance = this.buildMarkdownFormattingGuidance(contentComplexity);
    
    // Build full document context summary
    let documentSummary = '';
    if (fullDocument && fullDocument !== content) {
      const docStructure = this.extractDocumentStructure(fullDocument);
      const wordCount = fullDocument.split(/\s+/).length;
      documentSummary = `Document Overview: ${wordCount} words, ${documentAnalysis.dominantType} content with ${docStructure}`;
    }
    
    // Build local context
    let localContext = '';
    if (beforeText || afterText) {
      localContext = 'Local Context:\n';
      if (beforeText) localContext += `- Preceding: "${beforeText.slice(-100)}..."\n`;
      if (afterText) localContext += `- Following: "...${afterText.slice(0, 100)}"\n`;
    }
    
    // Build terminology and references
    let terminologySection = '';
    if (Object.keys(semanticContext.terminologyMap).length > 0) {
      const keyTerms = Object.entries(semanticContext.terminologyMap)
        .slice(0, 5)
        .map(([term, count]) => `${term} (${count})`)
        .join(', ');
      terminologySection = `Key Terminology: ${keyTerms}`;
    }
    
    if (semanticContext.relatedSections.length > 0) {
      terminologySection += `\nRelated Sections: ${semanticContext.relatedSections.join(', ')}`;
    }

    return `# PERSONA
You are an expert content strategist and writing specialist with deep expertise in ${documentAnalysis.dominantType} content, audience engagement, and technical communication. You excel at transforming content while preserving its essence and enhancing its impact.

# TASK
Rewrite the provided content according to the user's specific request while improving clarity, engagement, and effectiveness. Your goal is to create content that better serves its intended purpose and audience.

User Request: "${prompt}"

# CONTEXT

## Full Document Context
${documentSummary || 'Standalone content piece'}
${contextDescription}

## Local Context
${localContext || 'No surrounding context available'}
- Content Type: ${documentAnalysis.dominantType}
- Writing Style: ${styleDescription}
- Technical Density: ${contentComplexity.technicalTermRatio > 0.1 ? 'High' : 'Moderate'}
- Readability Level: ${documentAnalysis.styleMetrics?.readabilityLevel || 'Standard'}
- Formality: ${documentAnalysis.styleMetrics?.formalityScore > 50 ? 'Formal' : 'Conversational'}

## User-Defined Constraints
${terminologySection}
${complexityGuidance}

# REWRITING STRATEGY

## Core Principles
1. **Request Fulfillment**: Precisely address the user's specific request
2. **Meaning Preservation**: Maintain all key information and technical accuracy
3. **Quality Enhancement**: Improve clarity, flow, and engagement
4. **Audience Alignment**: Ensure content serves its intended audience
5. **Consistency**: Maintain document-wide style and terminology

## Quality Standards
- Address the user's specific request completely
- Enhance readability and comprehension
- Improve logical flow and organization
- Strengthen key messages and arguments
- Ensure consistent terminology usage
- Maintain original language and cultural context

${markdownGuidance}

# OUTPUT FORMAT
- Provide ONLY the rewritten content
- Maintain original markdown structure and formatting
- Preserve all technical elements (code, formulas, links)
- Ensure output is immediately usable
- Focus on fulfilling the user's specific request

CONTENT TO REWRITE:
\`\`\`markdown
${content}
\`\`\`

Rewritten content:`;
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
    const markdownGuidance = this.buildMarkdownFormattingGuidance(enhancedContext.contentComplexity || {});
    const contentType = enhancedContext.documentAnalysis?.dominantType || 'general';
    
    return `# PERSONA
You are an expert content strategist and writing specialist with deep expertise in ${contentType} content and technical communication. You excel at maintaining consistency across document chunks while enhancing individual sections.

# TASK
Rewrite chunk ${position + 1} of ${total} chunks according to the user's request while maintaining seamless integration with the overall document flow.

User Request: "${prompt}"

# CONTEXT

## Full Document Context
${chunkContext.chunkSpecificContext}
- Document Structure: ${context.documentStructure}
- Style Guide: ${context.styleGuide}

## Local Context
- Chunk Type: ${chunk.type}
- Position: ${position + 1}/${total}
- Preceding Content: ${context.precedingContent || 'None'}
- Following Preview: ${context.followingPreview || 'None'}

## User-Defined Constraints
${chunkContext.maintainConsistency ? '- Maintain consistency with previous chunks\n- Ensure smooth transitions between sections\n- Preserve established terminology and patterns' : '- This is the first chunk, establish tone and style'}

# REWRITING STRATEGY

## Core Principles
1. **Request Fulfillment**: Address the user's specific request for this chunk
2. **Document Continuity**: Ensure seamless flow with adjacent chunks
3. **Quality Enhancement**: Improve clarity and engagement
4. **Consistency**: Maintain document-wide style and terminology
5. **Technical Accuracy**: Preserve all technical content and formatting

## Chunk-Specific Requirements
${chunkContext.isFirstChunk ? '- Establish clear introduction and tone\n- Set expectations for the document' : ''}
${chunkContext.isLastChunk ? '- Provide appropriate conclusion or summary\n- Ensure satisfying closure' : ''}
${!chunkContext.isFirstChunk && !chunkContext.isLastChunk ? '- Maintain smooth transitions from previous content\n- Prepare logical flow to next section' : ''}

${markdownGuidance}

# OUTPUT FORMAT
- Provide ONLY the rewritten chunk content
- Maintain original markdown structure and formatting
- Preserve all technical elements (code, formulas, links)
- Ensure seamless integration with document flow
- Focus on fulfilling the user's specific request

CONTENT TO REWRITE:
\`\`\`markdown
${chunk.content}
\`\`\`

Rewritten chunk:`;
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
    
    if (contentComplexity.codeRatio > 0.1) {
      guidance += '- Preserve all code blocks with proper ```language syntax\n';
      guidance += '- Maintain proper indentation and formatting in code\n';
      guidance += '- Use inline code with single backticks for code snippets\n';
    }
    
    if (contentComplexity.mathRatio > 0.05) {
      guidance += '- Use proper KaTeX syntax: $inline$ and $$display$$ math\n';
      guidance += '- Ensure mathematical expressions are properly formatted\n';
      guidance += '- Use LaTeX commands for symbols (\\alpha, \\beta, \\frac{}{})\n';
    }
    
    if (contentComplexity.tableRatio > 0.05) {
      guidance += '- Maintain table structure with proper | alignment\n';
      guidance += '- Include table headers with --- separators\n';
      guidance += '- Preserve data relationships in tables\n';
    }
    
    if (contentComplexity.listRatio > 0.1) {
      guidance += '- Use consistent list formatting (- for bullets, 1. for numbers)\n';
      guidance += '- Maintain proper list hierarchy and indentation\n';
      guidance += '- Ensure proper spacing between list items\n';
    }
    
    return guidance;
  }

  private buildMarkdownFormattingGuidance(contentComplexity: ContentComplexity): string {
    let guidance = 'MARKDOWN FORMATTING REQUIREMENTS:\n';
    guidance += '- Use proper header hierarchy (# ## ### #### ##### ######)\n';
    guidance += '- Format emphasis correctly: **bold** and *italic*\n';
    guidance += '- Use [link text](URL) format for all links\n';
    guidance += '- Use ![alt text](image URL) format for images\n';
    guidance += '- Use > for blockquotes with proper spacing\n';
    guidance += '- Use --- for horizontal rules\n';
    guidance += '- Ensure proper line breaks between paragraphs\n';
    
    if (contentComplexity.mathRatio > 0.01) {
      guidance += '\nMATHEMATICAL FORMATTING (KaTeX):\n';
      guidance += '- Inline math: $E = mc^2$, $\\sum_{i=1}^{n} x_i$, $a \\equiv b \\pmod{m}$\n';
      guidance += '- Display math: $$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$\n';
      guidance += '- Matrices: $$\\begin{pmatrix} a & b \\\\\\\\ c & d \\end{pmatrix}$$\n';
      guidance += '- Fractions: \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}\n';
      guidance += '- Limits: $$\\lim_{x \\to 0} \\frac{\\sin(x)}{x} = 1$$\n';
      guidance += '- Integrals: $$\\int_0^\\infty x^{z-1} e^{-x} dx$$\n';
      guidance += '- Summations: $$\\sum_{i=1}^{n} u_i v_i$$\n';
      guidance += '- Greek letters: \\alpha, \\beta, \\gamma, \\delta, \\mu, \\nu, \\omega, \\Gamma\n';
      guidance += '- Vectors: \\mathbf{v}, \\nabla f, \\mathbf{a} \\times \\mathbf{b}\n';
      guidance += '- Special functions: \\Gamma(z), \\sin(x), \\cos(x), \\ln(x)\n';
      guidance += '- Binomial coefficients: {n \\choose k} or \\binom{n}{k}\n';
      guidance += '- Derivatives: \\frac{dy}{dx}, \\frac{\\partial f}{\\partial x}\n';
      guidance += '- Complex equations: Einstein field equations, Navier-Stokes, etc.\n';
      guidance += '- Determinants: $$\\begin{vmatrix} \\mathbf{i} & \\mathbf{j} & \\mathbf{k} \\\\\\\\ a_1 & a_2 & a_3 \\\\\\\\ b_1 & b_2 & b_3 \\end{vmatrix}$$\n';
    }
    
    if (contentComplexity.codeRatio > 0.01) {
      guidance += '\nCODE FORMATTING:\n';
      guidance += '- Code blocks: ```javascript\\ncode here\\n```\n';
      guidance += '- Inline code: `variable` or `function()`\n';
      guidance += '- Specify language for syntax highlighting\n';
      guidance += '- Maintain proper indentation within code blocks\n';
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