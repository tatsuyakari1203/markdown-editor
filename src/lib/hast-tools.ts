/**
 * General tooling for working with HAST.
 */

import type { Nodes as HastNodes, Element, Text, Parent } from 'hast';

/**
 * Get the complete text content of a HAST node.
 */
export function getHastTextContent(node: HastNodes): string {
  if (node.type === 'text') {
    return (node as Text).value;
  } else if ('children' in node && node.children) {
    return (node as Parent).children.map(getHastTextContent).join('');
  } else {
    return '';
  }
}

/**
 * Wrap the children of `node` with the `wrapper` node.
 */
export function wrapChildren(node: Parent, wrapper: Element): Element {
  wrapper.children = node.children;
  node.children = [wrapper];
  return wrapper;
}

interface CodeBlockRange {
  node: Parent;
  start: number;
  end: number;
}

/**
 * Transform a range in a HAST tree into a code block. This replaces the nodes
 * with nodes that represent markup like `<pre><code>content</code></pre>` to
 * represent a code block. Any `<p>` nodes in the content are removed and
 * replaced with their content followed by a new `<br>` node.
 */
export function wrapInCodeBlock(range: CodeBlockRange, language: string | null = null): void {
  const languageClasses = language ? [`language-${language}`] : [];

  const contents = range.node.children
    .slice(range.start, range.end)
    .flatMap((node): HastNodes[] => {
      // Unwrap paragraphs and replace them with their contents + a line break
      // so we don't wind up adding blank lines around each line of code.
      if (node.type === 'element' && (node as Element).tagName === 'p') {
        const element = node as Element;
        return [
          ...element.children,
          {
            type: 'element',
            tagName: 'br',
            properties: {},
            children: [],
          } as Element,
        ];
      }
      return [node];
    });

  const length = range.end - range.start;
  const codeBlock: Element = {
    type: 'element',
    tagName: 'pre',
    properties: {},
    children: [
      {
        type: 'element',
        tagName: 'code',
        properties: {
          className: languageClasses,
        },
        children: contents,
      } as Element,
    ],
  };

  range.node.children.splice(range.start, length, codeBlock);
}

/**
 * Type guard to check if a node is an Element
 */
export function isElement(node: HastNodes): node is Element {
  return node.type === 'element';
}

/**
 * Type guard to check if a node is a Text node
 */
export function isText(node: HastNodes): node is Text {
  return node.type === 'text';
}

/**
 * Type guard to check if a node has children
 */
export function hasChildren(node: HastNodes): node is Parent {
  return 'children' in node && Array.isArray((node as any).children);
}

/**
 * Safely get element properties
 */
export function getElementProperties(node: HastNodes): Record<string, any> {
  if (isElement(node)) {
    return node.properties || {};
  }
  return {};
}

/**
 * Safely get element tag name
 */
export function getElementTagName(node: HastNodes): string | null {
  if (isElement(node)) {
    return node.tagName;
  }
  return null;
}