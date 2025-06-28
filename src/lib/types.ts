/**
 * Shared type definitions for the markdown editor library
 */

import type { Element } from 'hast';

// Style interface
export interface Style {
  [property: string]: string;
}

// Extended Element type with cached style properties
export interface ElementWithStyle extends Element {
  _style?: Style;
  _resolvedStyle?: Style;
}