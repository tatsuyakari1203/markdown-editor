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

MARKDOWN FORMATTING RULES:
7. Headers: Ensure proper spacing (# Header, ## Subheader)
8. Emphasis: Fix bold (**text**) and italic (*text*) formatting
9. Lists: Standardize bullet points (-) and numbering (1.)
10. Links: Ensure proper format [text](url) and fix broken links
11. Images: Ensure proper format ![alt](src) with descriptive alt text
12. Tables: Fix alignment, spacing, and ensure proper pipe (|) separation
13. Blockquotes: Ensure proper > formatting with consistent spacing
14. Horizontal rules: Standardize to --- format
15. Line breaks: Use proper double line breaks for paragraphs

CODE FORMATTING RULES:
16. Code blocks: Ensure proper \`\`\`language syntax with language specification
17. Inline code: Use single backticks \`code\` for inline code
18. Indentation: Fix proper indentation within code blocks
19. Syntax highlighting: Specify correct language for code blocks
20. Code structure: Separate merged code lines and fix formatting

MATHEMATICAL CONTENT (KaTeX) RULES:
21. Inline math: Use single dollar signs $equation$ for inline mathematics
22. Display math: Use double dollar signs $$equation$$ for block mathematics
23. Fractions: Ensure proper \\frac{numerator}{denominator} format
24. Superscripts: Use ^{} for exponents (x^{2}, e^{-x})
25. Subscripts: Use _{} for subscripts (x_{1}, H_{2}O)
26. Greek letters: Use proper LaTeX commands (\\alpha, \\beta, \\gamma, \\delta, \\epsilon, \\zeta, \\eta, \\theta, \\iota, \\kappa, \\lambda, \\mu, \\nu, \\xi, \\pi, \\rho, \\sigma, \\tau, \\upsilon, \\phi, \\chi, \\psi, \\omega)
27. Mathematical operators: Use proper symbols (\\times, \\div, \\pm, \\mp, \\cdot, \\ast, \\star, \\circ, \\bullet)
28. Functions: Use proper formatting (\\sin, \\cos, \\tan, \\log, \\ln, \\exp, \\lim, \\max, \\min, \\sup, \\inf)
29. Matrices: Use proper \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} or \\begin{vmatrix} for determinants
30. Integrals: Use \\int, \\iint, \\iiint with proper limits (\\int_a^b, \\int_{-\\infty}^{\\infty})
31. Summations: Use \\sum_{i=1}^{n} format with proper limits
32. Products: Use \\prod_{i=1}^{n} format with proper limits
33. Square roots: Use \\sqrt{} or \\sqrt[n]{} for nth roots
34. Brackets: Use \\left( \\right), \\left[ \\right], \\left\\{ \\right\\} for auto-sizing
35. Binomial coefficients: Use \\binom{n}{k} or {n \\choose k} format
36. Modular arithmetic: Use \\equiv for congruence, \\pmod{m} for modulo
37. Derivatives: Use \\frac{dy}{dx}, \\frac{\\partial f}{\\partial x} for partial derivatives
38. Gradients: Use \\nabla for gradient operator
39. Limits: Use \\lim_{x \\to a} format with proper arrow (\\to, \\rightarrow, \\leftarrow)
40. Special functions: Use \\Gamma for gamma function, proper formatting for special functions
41. Complex numbers: Use \\mathbb{C}, \\mathbb{R}, \\mathbb{Z}, \\mathbb{N} for number sets
42. Vectors: Use \\mathbf{v} for bold vectors, \\vec{v} for arrow vectors
43. Cross products: Use \\times for cross product, proper determinant format
44. Spacing: Ensure proper spacing around mathematical expressions (\\, for thin space, \\; for medium space, \\quad for quad space)

SPECIAL FORMATTING FIXES:
35. Remove HTML comments like <!---->
36. Fix merged/concatenated words (e.g., "**PDF-LIB**là" → "**PDF-LIB** là")
37. Correct spacing around punctuation and formatting
38. Fix broken markdown syntax and escape characters
39. Ensure consistent formatting throughout the document
40. Maintain the original language and tone

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

    return `You are an expert content writer and editor with deep knowledge of ${documentAnalysis.dominantType} writing and advanced markdown formatting. ${contextDescription}${contextSection}

WRITING STYLE REQUIREMENTS:
- Maintain ${styleDescription} tone and style
- Technical density level: ${contentComplexity.technicalTermRatio > 0.1 ? 'High' : 'Moderate'}
- Readability target: ${documentAnalysis.styleMetrics.readabilityLevel}
- Formality level: ${documentAnalysis.styleMetrics.formalityScore > 50 ? 'Formal' : 'Conversational'}

${complexityGuidance}

${markdownGuidance}

CONTENT TO REWRITE:
${content}

USER REQUEST:
${prompt}

IMPORTANT OUTPUT REQUIREMENTS:
- Your response MUST be in valid markdown format
- Ensure all mathematical expressions use proper KaTeX syntax
- Use appropriate markdown elements (headers, lists, code blocks, etc.)
- Maintain consistent formatting throughout
- Return ONLY the rewritten content in markdown format

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
    const markdownGuidance = this.buildMarkdownFormattingGuidance(enhancedContext.contentComplexity || {});
    
    return `You are rewriting chunk ${position + 1} of ${total} chunks. ${chunkContext.chunkSpecificContext}

${chunkContext.maintainConsistency ? 'CONSISTENCY REQUIREMENTS:\n- Maintain consistent tone and style with previous chunks\n- Ensure smooth transitions\n- Preserve terminology and formatting patterns\n- Use consistent markdown formatting throughout\n\n' : ''}

CHUNK CONTEXT:
- Document structure: ${context.documentStructure}
- Style guide: ${context.styleGuide}
- Preceding content: ${context.precedingContent}
- Following preview: ${context.followingPreview}

${markdownGuidance}

CONTENT TO REWRITE:
${chunk.content}

USER REQUEST:
${prompt}

IMPORTANT OUTPUT REQUIREMENTS:
- Your response MUST be in valid markdown format
- Ensure all mathematical expressions use proper KaTeX syntax
- Use appropriate markdown elements consistently
- Return ONLY the rewritten content in markdown format

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