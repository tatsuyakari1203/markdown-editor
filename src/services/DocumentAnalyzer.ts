import { DocumentAnalysis, SemanticContext, ContextWindow } from './gemini/types';
import { TokenOptimizer } from './gemini/TokenOptimizer';

export class DocumentAnalyzer {
  private tokenOptimizer: TokenOptimizer;

  constructor(tokenOptimizer: TokenOptimizer) {
    this.tokenOptimizer = tokenOptimizer;
  }

  performDeepDocumentAnalysis(fullDocument: string, targetContent: string): DocumentAnalysis {
    const lines = fullDocument.split('\n');
    const targetLines = targetContent.split('\n');
    
    // Document structure analysis
    const headings = fullDocument.match(/^#{1,6}\s+.+$/gm) || [];
    const headingHierarchy = this.buildHeadingHierarchy(headings);
    
    // Content type detection with confidence scores
    const contentTypes = {
      technical: this.calculateContentTypeScore(fullDocument, /\b(API|function|class|method|algorithm|implementation|code|syntax|programming|software|development|framework|library)\b/gi),
      academic: this.calculateContentTypeScore(fullDocument, /\b(research|study|analysis|conclusion|methodology|hypothesis|theory|experiment|data|results|findings)\b/gi),
      business: this.calculateContentTypeScore(fullDocument, /\b(strategy|market|customer|revenue|business|company|product|sales|marketing|profit|growth)\b/gi),
      creative: this.calculateContentTypeScore(fullDocument, /\b(story|narrative|character|plot|creative|artistic|design|aesthetic|visual|inspiration)\b/gi),
      mathematical: this.calculateContentTypeScore(fullDocument, /\$[^$]+\$|\$\$[\s\S]*?\$\$|\b(equation|formula|theorem|proof|calculation|mathematics|algebra|calculus)\b/gi)
    };
    
    const dominantType = Object.entries(contentTypes).reduce((a, b) => contentTypes[a[0]] > contentTypes[b[0]] ? a : b)[0];
    
    // Writing style analysis
    const styleMetrics = {
      averageSentenceLength: this.calculateAverageSentenceLength(fullDocument),
      formalityScore: this.calculateFormalityScore(fullDocument),
      technicalDensity: this.calculateTechnicalDensity(fullDocument),
      readabilityLevel: this.estimateReadabilityLevel(fullDocument)
    };
    
    // Cross-reference analysis
    const crossReferences = this.findCrossReferences(targetContent, fullDocument);
    
    return {
      headingHierarchy,
      contentTypes,
      dominantType,
      styleMetrics,
      crossReferences,
      documentLength: fullDocument.length,
      targetPosition: this.findContentPosition(targetContent, fullDocument)
    };
  }

  extractSemanticContext(content: string, fullDocument: string): SemanticContext {
    // Find related sections based on keyword overlap
    const contentKeywords = this.extractKeywords(content);
    const relatedSections = this.findRelatedSections(contentKeywords, fullDocument, content);
    
    // Extract terminology consistency patterns
    const terminologyMap = this.buildTerminologyMap(fullDocument);
    
    // Identify content dependencies
    const dependencies = this.identifyContentDependencies(content, fullDocument);
    
    return {
      relatedSections,
      terminologyMap,
      dependencies,
      keywords: contentKeywords
    };
  }

  calculateOptimalContextWindow(content: string, beforeText: string, afterText: string): ContextWindow {
    const contentTokens = this.tokenOptimizer.estimateTokens(content);
    const maxContextTokens = Math.min(200000, Math.floor((1000000 - contentTokens) * 0.4));
    
    // Intelligent context selection
    const beforeTokens = this.tokenOptimizer.estimateTokens(beforeText);
    const afterTokens = this.tokenOptimizer.estimateTokens(afterText);
    
    let optimalBefore = beforeText;
    let optimalAfter = afterText;
    
    if (beforeTokens + afterTokens > maxContextTokens) {
      const ratio = beforeTokens / (beforeTokens + afterTokens);
      const beforeLimit = Math.floor(maxContextTokens * ratio);
      const afterLimit = maxContextTokens - beforeLimit;
      
      optimalBefore = this.truncateContextIntelligently(beforeText, beforeLimit, 'before');
      optimalAfter = this.truncateContextIntelligently(afterText, afterLimit, 'after');
    }
    
    return {
      before: optimalBefore,
      after: optimalAfter,
      totalTokens: this.tokenOptimizer.estimateTokens(optimalBefore + optimalAfter)
    };
  }

  private buildHeadingHierarchy(headings: string[]): any[] {
    return headings.map(heading => {
      const level = heading.match(/^#+/)?.[0].length || 1;
      const text = heading.replace(/^#+\s*/, '');
      return { level, text };
    });
  }

  private calculateContentTypeScore(text: string, pattern: RegExp): number {
    const matches = text.match(pattern) || [];
    const words = text.split(/\s+/).length;
    return words > 0 ? (matches.length / words) * 100 : 0;
  }

  private calculateAverageSentenceLength(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const totalWords = text.split(/\s+/).length;
    return sentences.length > 0 ? totalWords / sentences.length : 0;
  }

  private calculateFormalityScore(text: string): number {
    const formalWords = text.match(/\b(therefore|however|furthermore|consequently|nevertheless|moreover|thus|hence|accordingly|subsequently)\b/gi) || [];
    const informalWords = text.match(/\b(gonna|wanna|yeah|ok|cool|awesome|stuff|things|kinda|sorta)\b/gi) || [];
    const totalWords = text.split(/\s+/).length;
    
    if (totalWords === 0) return 0;
    
    const formalScore = (formalWords.length / totalWords) * 100;
    const informalScore = (informalWords.length / totalWords) * 100;
    
    return Math.max(0, Math.min(100, 50 + formalScore - informalScore));
  }

  private calculateTechnicalDensity(text: string): number {
    const technicalTerms = text.match(/\b(function|class|method|API|algorithm|implementation|framework|library|syntax|programming|development|software|code|variable|parameter|return|import|export|interface|type|async|await|promise|callback)\b/gi) || [];
    const totalWords = text.split(/\s+/).length;
    return totalWords > 0 ? (technicalTerms.length / totalWords) * 100 : 0;
  }

  private estimateReadabilityLevel(text: string): string {
    const avgSentenceLength = this.calculateAverageSentenceLength(text);
    const complexWords = text.match(/\b\w{7,}\b/g) || [];
    const totalWords = text.split(/\s+/).length;
    const complexWordRatio = totalWords > 0 ? complexWords.length / totalWords : 0;
    
    const score = avgSentenceLength * 0.39 + complexWordRatio * 11.8;
    
    if (score < 6) return 'Elementary';
    if (score < 9) return 'Middle School';
    if (score < 13) return 'High School';
    if (score < 16) return 'College';
    return 'Graduate';
  }

  private findCrossReferences(targetContent: string, fullDocument: string): string[] {
    const references: string[] = [];
    const targetKeywords = this.extractKeywords(targetContent);
    
    const sections = fullDocument.split(/\n#{1,6}\s+/);
    
    sections.forEach(section => {
      const sectionKeywords = this.extractKeywords(section);
      const overlap = targetKeywords.filter(keyword => sectionKeywords.includes(keyword));
      
      if (overlap.length > 0 && !section.includes(targetContent)) {
        const sectionTitle = section.split('\n')[0];
        references.push(sectionTitle);
      }
    });
    
    return references;
  }

  private findContentPosition(targetContent: string, fullDocument: string): number {
    const index = fullDocument.indexOf(targetContent);
    return index !== -1 ? index / fullDocument.length : 0;
  }

  private extractKeywords(text: string): string[] {
    // Remove common words and extract meaningful terms
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those']);
    
    return text
      .toLowerCase()
      .match(/\b\w{3,}\b/g)
      ?.filter(word => !commonWords.has(word))
      ?.slice(0, 20) || [];
  }

  private findRelatedSections(keywords: string[], fullDocument: string, excludeContent: string): string[] {
    const sections = fullDocument.split(/\n#{1,6}\s+/);
    const relatedSections: string[] = [];
    
    sections.forEach(section => {
      if (section.includes(excludeContent)) return;
      
      const sectionKeywords = this.extractKeywords(section);
      const overlap = keywords.filter(keyword => sectionKeywords.includes(keyword));
      
      if (overlap.length >= 2) {
        const sectionTitle = section.split('\n')[0];
        relatedSections.push(sectionTitle);
      }
    });
    
    return relatedSections.slice(0, 5);
  }

  private buildTerminologyMap(fullDocument: string): Record<string, string[]> {
    const terminologyMap: Record<string, string[]> = {};
    
    // Extract technical terms and their variations
    const technicalTerms = fullDocument.match(/\b[A-Z][a-zA-Z]*(?:[A-Z][a-zA-Z]*)*\b/g) || [];
    
    technicalTerms.forEach(term => {
      const variations = fullDocument.match(new RegExp(`\\b${term}[a-zA-Z]*\\b`, 'gi')) || [];
      if (variations.length > 1) {
        terminologyMap[term] = [...new Set(variations)];
      }
    });
    
    return terminologyMap;
  }

  private identifyContentDependencies(content: string, fullDocument: string): string[] {
    const dependencies: string[] = [];
    
    // Look for references to other sections
    const references = content.match(/(?:see|refer to|as mentioned in|according to)\s+[^.!?]+/gi) || [];
    
    references.forEach(ref => {
      const cleanRef = ref.replace(/(?:see|refer to|as mentioned in|according to)\s+/i, '').trim();
      if (fullDocument.includes(cleanRef)) {
        dependencies.push(cleanRef);
      }
    });
    
    return dependencies;
  }

  private truncateContextIntelligently(text: string, tokenLimit: number, direction: 'before' | 'after'): string {
    const estimatedTokens = this.tokenOptimizer.estimateTokens(text);
    
    if (estimatedTokens <= tokenLimit) {
      return text;
    }
    
    const ratio = tokenLimit / estimatedTokens;
    const targetLength = Math.floor(text.length * ratio);
    
    if (direction === 'before') {
      // Keep the end of the before text (most recent context)
      const truncated = text.slice(-targetLength);
      // Find the first complete sentence or paragraph
      const firstNewline = truncated.indexOf('\n');
      return firstNewline > 0 ? truncated.slice(firstNewline + 1) : truncated;
    } else {
      // Keep the beginning of the after text (immediate following context)
      const truncated = text.slice(0, targetLength);
      // Find the last complete sentence or paragraph
      const lastNewline = truncated.lastIndexOf('\n');
      return lastNewline > 0 ? truncated.slice(0, lastNewline) : truncated;
    }
  }
}