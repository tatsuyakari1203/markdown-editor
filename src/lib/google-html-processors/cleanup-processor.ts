import { visit } from 'unist-util-visit';
import type { Node, Element, Text } from 'hast';
import { BaseProcessor } from './base-processor';
import { isElement, isText, hasChildren, isVoid, containsReplacedElement } from '../type-guards';

/**
 * Clean up unnecessary elements and attributes from Google Docs HTML.
 * This includes removing empty elements, unnecessary attributes, and
 * normalizing the document structure.
 */
export class CleanupProcessor extends BaseProcessor {
  process(tree: Node): void {
    this.removeUnnecessaryElements(tree);
    this.cleanupAttributes(tree);
    this.normalizeWhitespace(tree);
    this.removeEmptyElements(tree);
  }

  private removeUnnecessaryElements(node: Node): void {
    const unnecessaryTags = new Set([
      'meta',
      'style',
      'script',
      'link',
      'title',
      'head',
      'html',
      'body'
    ]);

    visit(node, isElement, (element, index, parent) => {
      if (unnecessaryTags.has(element.tagName)) {
        if (parent && typeof index === 'number') {
          (parent as any).children.splice(index, 1);
          return index;
        }
      }
    });
  }

  private cleanupAttributes(node: Node): void {
    visit(node, isElement, (element: Element) => {
      if (!element.properties) return;

      // Remove Google Docs specific attributes
      const googleDocsAttrs = [
        'id',
        'class',
        'dir',
        'lang',
        'data-*',
        'aria-*'
      ];

      // Clean up class names - remove Google Docs specific classes
      if (element.properties.className) {
        const classes = Array.isArray(element.properties.className)
          ? element.properties.className
          : [element.properties.className];
        
        const cleanClasses = classes.filter((cls: string) => {
          // Keep only meaningful classes, remove Google Docs internal classes
          return !cls.match(/^(c\d+|kix-|docs-)/i);
        }) as (string | number)[];

        if (cleanClasses.length === 0) {
          delete element.properties.className;
        } else {
          element.properties.className = cleanClasses;
        }
      }

      // Remove other unnecessary attributes
      const unnecessaryAttrs = [
        'id',
        'dir',
        'lang',
        'spellcheck',
        'contenteditable',
        'draggable',
        'tabindex'
      ];

      unnecessaryAttrs.forEach(attr => {
        delete element.properties[attr];
      });

      // Remove data-* attributes (Google Docs internal)
      Object.keys(element.properties).forEach(key => {
        if (key.startsWith('data') && !this.isImportantDataAttribute(key)) {
          delete element.properties[key];
        }
      });

      // Remove aria-* attributes unless they're important for accessibility
      Object.keys(element.properties).forEach(key => {
        if (key.startsWith('aria') && !this.isImportantAriaAttribute(key)) {
          delete element.properties[key];
        }
      });
    });
  }

  private isImportantDataAttribute(attr: string): boolean {
    // Keep important data attributes
    const importantDataAttrs = [
      'dataSuggestionId',
      'dataSuggestionType'
    ];
    return importantDataAttrs.includes(attr);
  }

  private isImportantAriaAttribute(attr: string): boolean {
    // Keep important aria attributes for accessibility
    const importantAriaAttrs = [
      'ariaLabel',
      'ariaDescribedby',
      'ariaLabelledby',
      'ariaHidden'
    ];
    return importantAriaAttrs.includes(attr);
  }

  private normalizeWhitespace(node: Node): void {
    visit(node, isText, (textNode: Text) => {
      // Normalize whitespace in text nodes
      textNode.value = textNode.value
        .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
        .replace(/^\s+|\s+$/g, ''); // Trim leading/trailing whitespace
    });
  }

  private removeEmptyElements(node: Node): void {
    visit(node, isElement, (element, index, parent) => {
      if (this.shouldRemoveElement(element)) {
        if (parent && typeof index === 'number') {
          (parent as any).children.splice(index, 1);
          return index;
        }
      }
    });
  }

  private shouldRemoveElement(element: Element): boolean {
    // Don't remove void elements
    if (isVoid(element)) {
      return false;
    }

    // Don't remove elements that contain replaced elements
    if (containsReplacedElement(element)) {
      return false;
    }

    // Don't remove elements with important attributes
    if (this.hasImportantAttributes(element)) {
      return false;
    }

    // Remove if element has no children
    if (!hasChildren(element) || element.children.length === 0) {
      return true;
    }

    // Remove if element only contains empty text
    const textContent = this.getTextContent(element);
    if (textContent.trim().length === 0) {
      return true;
    }

    return false;
  }

  private hasImportantAttributes(element: Element): boolean {
    if (!element.properties) return false;

    const importantAttrs = [
      'href',
      'src',
      'alt',
      'title',
      'colspan',
      'rowspan',
      'type',
      'value',
      'name'
    ];

    return importantAttrs.some(attr => element.properties![attr] != null);
  }

  private getTextContent(node: Node): string {
    if (isText(node)) {
      return node.value;
    }
    
    if (hasChildren(node)) {
      return node.children.map(child => this.getTextContent(child)).join('');
    }
    
    return '';
  }
}