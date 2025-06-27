import type { Node } from 'hast';
import type { SliceClip } from '../slice-clip';
import { BaseProcessor, type ProcessorOptions, type FileData } from './base-processor';
import { ListProcessor } from './list-processor';
import { StyleProcessor } from './style-processor';
import { SuggestionProcessor } from './suggestion-processor';
import { TableProcessor } from './table-processor';
import { CleanupProcessor } from './cleanup-processor';

export interface ConversionOptions {
  suggestions?: 'show' | 'hide' | 'accept' | 'reject';
  preserveStyles?: boolean;
  cleanupLevel?: 'minimal' | 'standard' | 'aggressive';
  [key: string]: any;
}

/**
 * Manages and orchestrates all Google HTML processors.
 * Processes the HTML tree through a series of specialized processors
 * in the correct order to ensure optimal results.
 */
export class GoogleHtmlProcessorManager {
  private processors: BaseProcessor[];
  private options: ConversionOptions;
  private sliceClip?: SliceClip;

  constructor(options: ConversionOptions = {}, sliceClip?: SliceClip) {
    this.options = {
      suggestions: 'show',
      preserveStyles: false,
      cleanupLevel: 'standard',
      ...options
    };
    this.sliceClip = sliceClip;
    this.processors = this.initializeProcessors();
  }

  /**
   * Process the HTML tree through all configured processors.
   */
  process(tree: Node): void {
    try {
      for (const processor of this.processors) {
        processor.process(tree);
      }
    } catch (error) {
      console.error('[GoogleHtmlProcessorManager] Processing failed:', error);
      throw error;
    }
  }

  /**
   * Initialize processors in the correct order.
   * Order matters - some processors depend on the output of others.
   */
  private initializeProcessors(): BaseProcessor[] {
    const processorOptions: ProcessorOptions = {
      suggestions: this.options.suggestions,
      preserveStyles: this.options.preserveStyles,
      cleanupLevel: this.options.cleanupLevel,
      ...this.options
    };

    const processors: BaseProcessor[] = [];

    // 1. Process suggestions first (affects content structure)
    processors.push(new SuggestionProcessor(processorOptions, this.sliceClip));

    // 2. Fix list structure (needs to happen before cleanup)
    processors.push(new ListProcessor(processorOptions, this.sliceClip));

    // 3. Process tables (structure normalization)
    processors.push(new TableProcessor(processorOptions, this.sliceClip));

    // 4. Process styles (if preservation is disabled, this will clean them up)
    if (!this.options.preserveStyles) {
      processors.push(new StyleProcessor(processorOptions, this.sliceClip));
    }

    // 5. Final cleanup (should be last to clean up after other processors)
    processors.push(new CleanupProcessor(processorOptions, this.sliceClip));

    return processors;
  }

  /**
   * Add a custom processor to the pipeline.
   * @param processor The processor to add
   * @param position Optional position to insert at (default: end)
   */
  addProcessor(processor: BaseProcessor, position?: number): void {
    if (position !== undefined && position >= 0 && position <= this.processors.length) {
      this.processors.splice(position, 0, processor);
    } else {
      this.processors.push(processor);
    }
  }

  /**
   * Remove a processor from the pipeline.
   * @param processorClass The class of the processor to remove
   */
  removeProcessor(processorClass: new (...args: any[]) => BaseProcessor): void {
    this.processors = this.processors.filter(
      processor => !(processor instanceof processorClass)
    );
  }

  /**
   * Get the current list of processors.
   */
  getProcessors(): BaseProcessor[] {
    return [...this.processors];
  }

  /**
   * Update options for all processors.
   */
  updateOptions(newOptions: Partial<ConversionOptions>): void {
    this.options = { ...this.options, ...newOptions };
    // Reinitialize processors with new options
    this.processors = this.initializeProcessors();
  }
}

/**
 * Legacy compatibility function - maintains the same interface as the original.
 * @param tree The HTML tree to process
 * @param fileData Optional file data containing options and slice clip
 */
export function fixGoogleHtml(tree: Node, fileData?: FileData): void {
  const options: ConversionOptions = fileData?.options || {};
  const manager = new GoogleHtmlProcessorManager(options, fileData?.sliceClip);
  manager.process(tree);
}