// Base classes and interfaces
export { BaseProcessor, type ProcessorOptions, type FileData } from './base-processor';

// Individual processors
export { ListProcessor } from './list-processor';
export { StyleProcessor } from './style-processor';
export { SuggestionProcessor } from './suggestion-processor';
export { TableProcessor } from './table-processor';
export { CleanupProcessor } from './cleanup-processor';

// Manager and main functions
export { 
  GoogleHtmlProcessorManager, 
  fixGoogleHtml, 
  type ConversionOptions 
} from './processor-manager';

// Re-export type guards for convenience
export {
  isElement,
  isText,
  hasChildren,
  isList,
  isStyled,
  isBlock,
  isVoid,
  isSpaceSensitive,
  isCell,
  isAnchor,
  isSuggestion,
  isChecklistItem,
  containsReplacedElement,
  blockElements,
  voidElements,
  replacedElements,
  spaceSensitiveElements
} from '../type-guards';