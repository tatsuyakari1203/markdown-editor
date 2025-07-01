// Type definitions for Gemini service

export interface GeminiConfig {
  apiKey: string;
  model?: string;
}

export interface ReformatResponse {
  success: boolean;
  content: string;
  error?: string;
  chunksProcessed?: number;
  totalChunks?: number;
}

export interface RewriteResponse {
  success: boolean;
  content: string;
  error?: string;
}

export interface TextChunk {
  content: string;
  position: number;
  totalChunks: number;
  type: 'heading' | 'paragraph' | 'code' | 'list' | 'table' | 'mixed';
  startLine: number;
  endLine: number;
}

export interface ChunkingConfig {
  maxChunkSize: number;
  overlapSize: number;
  preserveStructure: boolean;
  maxOutputTokens: number;
}

export interface ChunkContext {
  documentStructure: string;
  precedingContent: string;
  followingPreview: string;
  styleGuide: string;
  totalChunks: number;
  currentPosition: number;
}

export interface ContentComplexity {
  codeRatio: number;
  mathRatio: number;
  tableRatio: number;
  listRatio: number;
}

export interface DocumentAnalysis {
  headingHierarchy: string[];
  contentTypes: Record<string, number>;
  dominantType: string;
  styleMetrics: {
    averageSentenceLength: number;
    formalityScore: number;
    technicalDensity: number;
    readabilityLevel: number;
  };
  crossReferences: any[];
  documentLength: number;
  targetPosition: string;
}

export interface SemanticContext {
  relatedSections: string[];
  terminologyMap: Record<string, string[]>;
  dependencies: any[];
  keywords: string[];
}

export interface ContextWindow {
  before: string;
  after: string;
  totalTokens: number;
}

export interface GenerationParameters {
  optimalTemperature: number;
  optimalTopK: number;
  optimalTopP: number;
  optimalOutputTokens: number;
}

export interface EnhancedRewriteContext {
  documentAnalysis: DocumentAnalysis;
  contentComplexity: ContentComplexity;
  semanticContext: SemanticContext;
  contextWindow: ContextWindow;
  shouldUseChunking: boolean;
  estimatedTokens: number;
  fullDocument: string;
  beforeText: string;
  afterText: string;
  documentStructure: string;
}