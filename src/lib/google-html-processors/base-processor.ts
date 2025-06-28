import type { Node } from 'hast';
import type { SliceClip } from '../slice-clip';

export interface ProcessorOptions {
  suggestions?: 'show' | 'hide' | 'accept' | 'reject';
  [key: string]: any;
}

export interface FileData {
  sliceClip?: SliceClip;
  options?: ProcessorOptions;
}

export abstract class BaseProcessor {
  protected options: ProcessorOptions;
  protected sliceClip?: SliceClip;

  constructor(options: ProcessorOptions = {}, sliceClip?: SliceClip) {
    this.options = options;
    this.sliceClip = sliceClip;
  }

  abstract process(tree: Node): void;

  protected logWarning(message: string): void {
    // Warning logging removed for cleaner output
  }

  protected logError(message: string, error?: Error): void {
    // Error logging removed for cleaner output
  }
}