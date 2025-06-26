import { h as hast } from 'hastscript';
import { CONTINUE, EXIT, visit } from 'unist-util-visit';
import { visitParents } from 'unist-util-visit-parents';
import type { Node, Element, Text, Parent } from 'hast';
import type { VFile } from 'vfile';
import type { Plugin } from 'unified';
import { resolveNodeStyle, type ElementWithStyle } from './css.ts';
import { wrapChildren, wrapInCodeBlock } from './hast-tools.ts';
import {
  sliceClipText,
  rangesForSuggestions,
  getBookmarks,
  getHeadings,
  replaceRangesInTree,
  rangesForCodeSnippets,
  visitRangesInTree,
  type SliceClip,
  type SliceClipResolved,
} from './slice-clip.ts';

// Type definitions
export interface ConversionOptions {
  suggestions?: 'show' | 'hide' | 'accept' | 'reject';
  [key: string]: any;
}

export interface FileData {
  sliceClip?: SliceClip;
  options?: ConversionOptions;
}

export interface VFileWithData extends VFile {
  data: FileData;
}

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

// Type guards and utility functions
const isElement = (node: Node): node is Element => node.type === 'element';
const isText = (node: Node): node is Text => node.type === 'text';
const hasChildren = (node: Node): node is Parent => 'children' in node && Array.isArray(node.children);

const isList = (node: Node): node is Element => 
  isElement(node) && (node.tagName === 'ul' || node.tagName === 'ol');

const isStyled = (node: Node): node is ElementWithStyle => 
  isElement(node) && node.properties?.style != null;

const isBlock = (node: Node): boolean => 
  isElement(node) && blockElements.has(node.tagName);

const isVoid = (node: Node): boolean => 
  isElement(node) && voidElements.has(node.tagName);

const isSpaceSensitive = (node: Node): boolean =>
  isElement(node) && spaceSensitiveElements.has(node.tagName);



/**
 * Wrap a range of children in a code block
 */
function wrapInCodeBlock(block: { node: Node; start: number; end: number }): void {
  if (!hasChildren(block.node)) return;
  
  const children = block.node.children.slice(block.start, block.end);
  const codeElement = hast('code', children);
  const preElement = hast('pre', [codeElement]);
  
  block.node.children.splice(block.start, block.end - block.start, preElement);
}

const isCell = (node: Node): boolean => 
  isElement(node) && (node.tagName === 'th' || node.tagName === 'td');

const isAnchor = (node: Node): boolean => 
  isElement(node) && node.tagName === 'a';

const isSuggestion = (node: Node): boolean => 
  isElement(node) && node.properties?.dataSuggestionId != null;

const spaceAtStartPattern = /^(\s+)/;
const spaceAtEndPattern = /(\s+)$/;

/**
 * Check if a node contains any replaced elements and shouldn't be wrapped in
 * some Markdown markup that prevents them from displaying (e.g. a code block).
 * Replaced elements are those that are replaced by external content or
 * represent non-text media.
 */
function containsReplacedElement(node: Node): boolean {
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

/**
 * Fix the incorrect formatting of nested lists in Google Docs's HTML. Lists
 * can only have `div` and `li` children, but Google Docs has other lists as
 * direct descendents. This moves those free-floating lists into the previous
 * `li` element under the assumption that they represent subitems of it.
 */
export function fixNestedLists(node: Node): void {
  visit(node, isList, (listNode, index, parent) => {
    if (parent && isList(parent) && typeof index === 'number') {
      const previous = parent.children[index - 1];
      if (isElement(previous) && previous.tagName === 'li') {
        if (!hasChildren(previous)) {
          previous.children = [];
        }
        previous.children.push(listNode);
        parent.children.splice(index, 1);
        return index;
      } else {
        console.warn('No previous list item to move nested list into!');
      }
    }
  });
}

/**
 * Google Docs does italics/bolds/etc on `<span>`s with style attributes, but
 * rehype-remark does not pick up on those. Instead, transform them into
 * semantic `em`, `strong`, etc. elements.
 */
export function unInlineStyles(node: Node): void {
  convertInlineStylesToElements(node);
  mergeConsecutiveInlineStyles(node);
}

/**
 * Convert CSS in style attributes to semantic elements that are more readily
 * converted to Markdown.
 */
function convertInlineStylesToElements(node: Node): void {
  visitParents(
    node,
    (n): n is ElementWithStyle => isStyled(n) && !isBlock(n),
    (node, parents) => {
      const style = resolveNodeStyle(node, parents as ElementWithStyle[]);

      if (style['font-style'] === 'italic') {
        wrapChildren(node, hast('em'));
      }

      const weight = style['font-weight'];
      if (weight === 'bold' || weight === '700') {
        wrapChildren(node, hast('strong'));
      }

      const verticalAlign = style['vertical-align'];
      if (verticalAlign === 'super') {
        wrapChildren(node, hast('sup'));
      } else if (verticalAlign === 'sub') {
        wrapChildren(node, hast('sub'));
      }

      // Some browsers paste with the `text-decoration` property and some use
      // the newer `text-decoration-line`, so we need to support both.
      const decorationLine =
        style['text-decoration'] || style['text-decoration-line'];
      if (decorationLine?.startsWith('line-through')) {
        wrapChildren(node, hast('del'));
      }

      // Google docs doesn't really have anything that represents "code", so
      // infer it from the use of monospace fonts.
      // Don't wrap in code if there's a replaced element present
      if (
        /,\s*monospace/.test(style['font-family'] || '') &&
        !containsReplacedElement(node)
      ) {
        wrapChildren(node, hast('code'));
      }

      // Keep the structure as flat as possible by removing semantically
      // meaningless elements once we've extracted formatting from them.
      if (node.tagName === 'span') {
        const parent = parents[parents.length - 1] as Parent;
        const index = parent.children.indexOf(node);
        if (index === -1) {
          throw new Error('Could not find visited node in its parent');
        }

        parent.children.splice(index, 1, ...node.children);
      }
    }
  );
}

/**
 * Merge consecutive inline style elements of the same type.
 */
function mergeConsecutiveInlineStyles(node: Node): void {
  visit(node, hasChildren, (parent) => {
    let i = 0;
    while (i < parent.children.length - 1) {
      const current = parent.children[i];
      const next = parent.children[i + 1];
      
      if (
        isElement(current) &&
        isElement(next) &&
        current.tagName === next.tagName &&
        !isBlock(current) &&
        hasChildren(current) &&
        hasChildren(next)
      ) {
        // Merge the children
        current.children.push(...next.children);
        parent.children.splice(i + 1, 1);
        // Don't increment i, check the same position again
      } else {
        i++;
      }
    }
  });
}

/**
 * Remove unwanted wrapper elements from clipboard HTML.
 */
function unwrapClipboardHtmlEnvelope(tree: Node): void {
  visit(tree, isElement, (node, index, parent) => {
    if (
      node.tagName === 'meta' ||
      node.tagName === 'style' ||
      (node.tagName === 'div' && node.properties?.id === 'docs-internal-guid')
    ) {
      if (parent && typeof index === 'number') {
        if (hasChildren(node)) {
          parent.children.splice(index, 1, ...node.children);
        } else {
          parent.children.splice(index, 1);
        }
        return index;
      }
    }
  });
}

/**
 * Mark suggestion ranges in the HTML tree.
 */
function markSuggestions(tree: Node, sliceClip?: SliceClip): void {
  if (!sliceClip) return;

  const docsText = sliceClipText(sliceClip);
  const insertions = rangesForSuggestions(sliceClip, 'insertion');
  const deletions = rangesForSuggestions(sliceClip, 'deletion');

  replaceRangesInTree(docsText, insertions, tree, (range, text) => {
    return hast('ins', { dataSuggestionId: range.suggestionId }, [{ type: 'text', value: text }]);
  });

  replaceRangesInTree(docsText, deletions, tree, (range, text) => {
    return hast('del', { dataSuggestionId: range.suggestionId }, [{ type: 'text', value: text }]);
  });
}

/**
 * Format suggestions based on options.
 */
function formatSuggestions(tree: Node, options?: ConversionOptions): void {
  const suggestionMode = options?.suggestions || 'show';
  
  visit(tree, isSuggestion, (node, index, parent) => {
    if (!parent || typeof index !== 'number') return;
    
    switch (suggestionMode) {
      case 'hide':
        parent.children.splice(index, 1);
        return index;
      case 'accept':
        if (isElement(node) && node.tagName === 'ins' && hasChildren(node)) {
          parent.children.splice(index, 1, ...node.children);
          return index;
        } else if (isElement(node) && node.tagName === 'del') {
          parent.children.splice(index, 1);
          return index;
        }
        break;
      case 'reject':
        if (isElement(node) && node.tagName === 'del' && hasChildren(node)) {
          parent.children.splice(index, 1, ...node.children);
          return index;
        } else if (isElement(node) && node.tagName === 'ins') {
          parent.children.splice(index, 1);
          return index;
        }
        break;
      // 'show' is the default - do nothing
    }
  });
}

/**
 * Determine whether all the text nodes that are descendents of this node are
 * wrapped inside nodes represent `<code>` elements. Returns `null` if the
 * node has no text descendents, otherwise returns a boolean.
 */
function isAllTextCode(parent: Node): boolean | null {
  if (!hasChildren(parent) || !parent.children?.length) return null;

  let hasText = false;
  for (const child of parent.children) {
    // Don't create code blocks if there are replaced elements present
    if (containsReplacedElement(child)) {
      return false;
    }

    if (isElement(child) && child.tagName === 'code') {
      hasText = true;
      continue;
    } else if (isText(child)) {
      return false;
    } else {
      const childResult = isAllTextCode(child);
      if (childResult === false) {
        return false;
      } else if (childResult === true) {
        hasText = true;
      }
    }
  }

  return hasText ? true : null;
}

/**
 * Identify paragraphs where all the text is wrapped in `<code>` nodes and wrap
 * the entire paragraph in a `<pre><code>` node. Merge consecutive all-code
 * paragraphs into a single `<pre><code>` block.
 */
export function createCodeBlocks(node: Node): void {
  if (!hasChildren(node) || !node.children?.length) return;

  // TODO: identify *lines* that are all code (not just block elements) by
  // splitting on `<br>` nodes, and break up parent blocks that have complete
  // code lines in them.

  const codeBlocks: Array<{
    node: Node;
    start: number;
    end: number;
  }> = [];
  let activeCodeBlock: {
    node: Node;
    start: number;
    end: number;
  } | null = null;

  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    // Don't rewrite already-existing code block markup.
    if (isElement(child) && (child.tagName === 'code' || child.tagName === 'pre')) continue;

    if (isBlock(child)) {
      // Check both for code and absence of replaced elements
      if (isAllTextCode(child) && !containsReplacedElement(child)) {
        if (!activeCodeBlock) {
          // Start a new code block when a new one is found
          activeCodeBlock = { node, start: i, end: i + 1 };
          codeBlocks.push(activeCodeBlock);
        }
      } else {
        if (activeCodeBlock) {
          // End the previous code block when the current line
          // is no longer a code block
          activeCodeBlock.end = i;
          activeCodeBlock = null;
        }
      }
    } else {
      createCodeBlocks(child);
    }
  }

  // End the code block if all lines were code
  if (activeCodeBlock) {
    activeCodeBlock.end = node.children.length;
  }

  // Go in reverse order so we can use the indexes as is, without worrying about
  // how replacing each block changes the indexes of the next one.
  for (const block of codeBlocks.reverse()) {
    wrapInCodeBlock(block);
  }
}

/**
 * Remove spaces from the start or end of nodes where it's not valid in Markdown
 * (e.g. `<em>`) and return the removed spaces. Works recursively to handle
 * nested nodes with surrounding spaces.
 */
function _extractInvalidSpace(node: Node, side: 'start' | 'end' = 'start'): string {
  let totalSpace = '';

  const reverse = side === 'start' ? false : true;
  visit(
    node,
    (child, index, parent) => {
      if (isText(child)) {
        const pattern =
          side === 'start' ? spaceAtStartPattern : spaceAtEndPattern;
        const spaceMatch = child.value.match(pattern);
        if (spaceMatch) {
          const space = spaceMatch[1];
          const body =
            side === 'start'
              ? child.value.slice(space.length)
              : child.value.slice(0, -space.length);
          totalSpace =
            side === 'start' ? totalSpace + space : space + totalSpace;
          if (body.length) {
            child.value = body;
            return EXIT;
          } else {
            if (parent && typeof index === 'number') {
              parent.children.splice(index, 1);
              return side === 'start' ? index : index - 1;
            }
          }
        } else {
          return EXIT;
        }
      } else if (isSpaceSensitive(child)) {
        return CONTINUE;
      } else {
        return EXIT;
      }
    },
    reverse
  );

  return totalSpace;
}

/**
 * In Google Docs (and HTML in general), an element that formats some text can
 * start with spaces, tabs, etc. However, in Markdown, some inline markup
 * (mainly emphasis marks like `**bold**` and `_italic_`) can't start or end
 * with spaces. This finds such elements and moves leading and trailing spaces
 * from inside to outside them.
 *
 * For example, this turns a tree like:
 *
 *     <p>Hello<em> italics </em></p>
 *
 * Into:
 *
 *     <p>Hello <em>italics</em> </p>
 */
export function moveSpaceOutsideSensitiveChildren(node: Node): void {
  visit(node, isSpaceSensitive, (node, index, parent) => {
    if (!parent || typeof index !== 'number') return;
    
    let nextIndex = index + 1;

    const startSpace = _extractInvalidSpace(node, 'start');
    if (startSpace) {
      parent.children.splice(index, 0, { type: 'text', value: startSpace });
      nextIndex++;
    }

    const endSpace = _extractInvalidSpace(node, 'end');
    if (endSpace) {
      parent.children.splice(nextIndex, 0, { type: 'text', value: endSpace });
      nextIndex++;
    }

    return nextIndex;
  });
}

/**
 * Get text alignment from node style.
 */
function getNodeTextAlignment(node: Node): string | null {
  if (!isElement(node)) return null;
  
  const style = resolveNodeStyle(node as ElementWithStyle);
  const alignMatch = style['text-align']?.match(/^(left|center|right)/);
  if (alignMatch) {
    return alignMatch[1];
  }
  return null;
}

/**
 * Tables in Google Docs don't actually put alignment info on the columns or
 * cells. Instead, cells have paragraphs that are aligned. This detects the
 * alignment of the content of table cells so that the Markdown conversion will
 * set the correct alignment for columns.
 */
export function detectTableColumnAlignment(node: Node): void {
  visit(node, isCell, (node) => {
    if (!isElement(node)) return;
    
    if (!node.properties?.align) {
      let alignment = getNodeTextAlignment(node);
      if (!alignment && hasChildren(node)) {
        for (let i = 0; i < node.children.length; i++) {
          const childAlignment = getNodeTextAlignment(node.children[i]);
          if (i === 0) {
            alignment = childAlignment;
          } else if (childAlignment !== alignment) {
            alignment = null;
            break;
          }
        }
      }

      if (alignment) {
        if (!node.properties) node.properties = {};
        node.properties.align = alignment;
      }
    }
  });
}

/**
 * Remove line breaks and other cleanup functions.
 */
function unwrapLineBreaks(tree: Node): void {
  visit(tree, (node): node is Element => isElement(node) && node.tagName === 'br', (node, index, parent) => {
    if (parent && typeof index === 'number') {
      parent.children.splice(index, 1, { type: 'text', value: '\n' });
      return index;
    }
  });
}

function moveLinebreaksOutsideOfAnchors(tree: Node): void {
  visit(tree, isAnchor, (node) => {
    // Simplified implementation
    if (hasChildren(node)) {
      node.children = node.children.filter(child => 
        !(isElement(child) && child.tagName === 'br')
      );
    }
  });
}

function removeLineBreaksBeforeBlocks(tree: Node): void {
  visit(tree, hasChildren, (parent) => {
    for (let i = parent.children.length - 1; i > 0; i--) {
      const current = parent.children[i];
      const previous = parent.children[i - 1];
      
      if (isBlock(current) && isText(previous) && previous.value.trim() === '') {
        parent.children.splice(i - 1, 1);
      }
    }
  });
}

function fixChecklists(tree: Node): void {
  // Simplified implementation for checklist handling
  visit(tree, (node): node is Element => isElement(node) && node.tagName === 'li', (listItem) => {
    if (hasChildren(listItem)) {
      const firstChild = listItem.children[0];
      if (isText(firstChild)) {
        const checkboxMatch = firstChild.value.match(/^\s*[☐☑✓]\s*/);
        if (checkboxMatch) {
          const isChecked = /[☑✓]/.test(checkboxMatch[0]);
          firstChild.value = firstChild.value.slice(checkboxMatch[0].length);
          
          const checkbox = hast('input', {
            type: 'checkbox',
            checked: isChecked,
            disabled: true
          });
          
          listItem.children.unshift(checkbox, { type: 'text', value: ' ' });
        }
      }
    }
  });
}

function removeFragmentMarkers(tree: Node): void {
  visit(tree, isText, (node, index, parent) => {
    // Remove various Google Docs fragment markers
    node.value = node.value.replace(/[\uE000-\uF8FF]/g, '');
    
    if (node.value === '' && parent && typeof index === 'number') {
      parent.children.splice(index, 1);
      return index;
    }
  });
}

function fixInternalLinks(tree: Node, sliceClip?: SliceClip): void {
  if (!sliceClip) return;
  
  const { ids: bookmarkIds } = getBookmarks(sliceClip);
  
  visit(tree, isAnchor, (node) => {
    const href = node.properties?.href as string;
    if (href?.startsWith('#')) {
      const bookmarkId = href.slice(1);
      if (bookmarkIds.has(bookmarkId)) {
        // Convert to internal link format
        node.properties = { ...node.properties, href: `#${bookmarkId}` };
      }
    }
  });
}

function placeBookmarks(tree: Node, sliceClip?: SliceClip): void {
  if (!sliceClip) return;
  
  const docsText = sliceClipText(sliceClip);
  const { ranges } = getBookmarks(sliceClip);
  
  replaceRangesInTree(docsText, ranges, tree, (range) => {
    return hast('a', { id: range.bookmark }, []);
  });
}

function fixCodeSnippetObjects(tree: Node, sliceClip?: SliceClip): void {
  if (!sliceClip) return;
  
  const docsText = sliceClipText(sliceClip);
  const codeRanges = rangesForCodeSnippets(sliceClip);
  
  replaceRangesInTree(docsText, codeRanges, tree, (range) => {
    const { codeBlock } = range;
    if (!codeBlock) return null;
    
    const codeElement = hast('code', {}, [{ type: 'text', value: codeBlock.text }]);
    const preElement = hast('pre', {}, [codeElement]);
    
    if (codeBlock.language) {
      if (!codeElement.properties) codeElement.properties = {};
      codeElement.properties.className = [`language-${codeBlock.language}`];
    }
    
    return preElement;
  });
}

/**
 * A Unified plugin that updates HTML with slice clip data. The slice clip
 * contains additional data about the Google Doc that is not present in the HTML,
 * so this modifies the HAST tree to carry that data in an HTML-centric way.
 */
export const updateHtmlWithSliceClip: Plugin<[], Node, Node> = () => {
  return (tree: Node, file: VFileWithData) => {
    unwrapClipboardHtmlEnvelope(tree);
    markSuggestions(tree, file.data.sliceClip);
    fixInternalLinks(tree, file.data.sliceClip);
    placeBookmarks(tree, file.data.sliceClip);
    fixCodeSnippetObjects(tree, file.data.sliceClip);

    return tree;
  };
};

/**
 * A Unified plugin that cleans up the HTML of a Google Doc so that it can be
 * handled effectively by Rehype-Remark. This is meant for the copy/pasted HTML
 * of a Doc, not *exported* HTML (the expect format needs more handling).
 */
export const cleanGoogleHtml: Plugin<[], Node, Node> = () => {
  return (tree: Node, file: VFileWithData) => {
    formatSuggestions(tree, file.data.options);
    unInlineStyles(tree);
    createCodeBlocks(tree);
    moveSpaceOutsideSensitiveChildren(tree);
    fixNestedLists(tree);
    detectTableColumnAlignment(tree);
    unwrapLineBreaks(tree);
    moveLinebreaksOutsideOfAnchors(tree);
    removeLineBreaksBeforeBlocks(tree);
    fixChecklists(tree);
    removeFragmentMarkers(tree);

    return tree;
  };
};