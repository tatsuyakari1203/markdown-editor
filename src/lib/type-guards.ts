import type { Node, Element, Text, Parent } from 'hast';
import type { ElementWithStyle } from './css';

// Element sets
const blockElements = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'caption',
  'center', // historic
  'col',
  'colgroup',
  'dd',
  'details',
  'dialog',
  'dir', // historic
  'div',
  'dl',
  'dt',
  'fieldset',
  'figcaption',
  'figure',
  'frameset', // historic
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hgroup',
  'hr',
  'isindex', // historic
  'li',
  'main',
  'menu',
  'nav',
  'noframes', // historic
  'ol',
  'p',
  'pre',
  'section',
  'summary',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'td',
  'th',
  'tr',
  'ul',
]);

const voidElements = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

// "Replaced" elements are elements that display content from some subresource
// rather than the text of the DOM inside them.
const replacedElements = new Set([
  'img',
  'video',
  'iframe',
  'embed',
  'fencedframe',
  'audio',
  'canvas',
  'object',
]);

// These elements convert to Markdown nodes that can't start or end with spaces.
// For example, you can't start emphasis with a space: `This * is emphasized*`.
const spaceSensitiveElements = new Set(['em', 'strong', 'ins', 'del']);

// Type guards
export const isElement = (node: Node): node is Element => node.type === 'element';
export const isText = (node: Node): node is Text => node.type === 'text';
export const hasChildren = (node: Node): node is Parent => 
  'children' in node && Array.isArray(node.children);

export const isList = (node: Node): node is Element => 
  isElement(node) && (node.tagName === 'ul' || node.tagName === 'ol');

export const isStyled = (node: Node): node is ElementWithStyle => 
  isElement(node) && node.properties?.style != null;

export const isBlock = (node: Node): boolean => {
  if (!isElement(node)) return false;
  return blockElements.has(node.tagName);
};

export const isVoid = (node: Node): boolean => {
  if (!isElement(node)) return false;
  return voidElements.has(node.tagName);
};

export const isSpaceSensitive = (node: Node): boolean =>
  isElement(node) && spaceSensitiveElements.has(node.tagName);

export const isCell = (node: Node): boolean => 
  isElement(node) && (node.tagName === 'th' || node.tagName === 'td');

export const isAnchor = (node: Node): boolean => 
  isElement(node) && node.tagName === 'a';

export const isSuggestion = (node: Node): boolean => 
  isElement(node) && node.properties?.dataSuggestionId != null;

export const isChecklistItem = (node: Node): boolean =>
  isElement(node) && node.tagName === 'li' && node.properties?.role === 'checkbox';

/**
 * Check if a node contains any replaced elements and shouldn't be wrapped in
 * some Markdown markup that prevents them from displaying (e.g. a code block).
 * Replaced elements are those that are replaced by external content or
 * represent non-text media.
 */
export function containsReplacedElement(node: Node): boolean {
  if (isElement(node)) {
    if (replacedElements.has(node.tagName)) {
      return true;
    }

    // Special case for <input type="image">
    if (node.tagName === 'input' && node.properties?.type === 'image') {
      return true;
    }

    if (hasChildren(node)) {
      return node.children.some(containsReplacedElement);
    }
  }

  return false;
}

// Export element sets for use in processors
export { blockElements, voidElements, replacedElements, spaceSensitiveElements };