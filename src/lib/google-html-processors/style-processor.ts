import { visit } from 'unist-util-visit';
import type { Node } from 'hast';
import { BaseProcessor } from './base-processor';
import { isStyled, isElement } from '../type-guards';
import { parseCssPropertyList, type ElementWithStyle } from '../css';

/**
 * Process and clean up CSS styles from Google Docs HTML.
 * This includes removing unnecessary styles and normalizing formatting.
 */
export class StyleProcessor extends BaseProcessor {
  process(tree: Node): void {
    this.processStyles(tree);
  }

  private processStyles(node: Node): void {
    visit(node, isStyled, (styledNode: ElementWithStyle) => {
      try {
        const style = parseCssPropertyList(styledNode.properties.style);
        
        // Remove common Google Docs styles that don't translate well to Markdown
        this.removeUnnecessaryStyles(style);
        
        // Update the node's style
        if (Object.keys(style).length === 0) {
          delete styledNode.properties.style;
        } else {
          styledNode.properties.style = this.styleToString(style);
        }
      } catch (error) {
        this.logError('Failed to process style', error as Error);
      }
    });
  }

  private removeUnnecessaryStyles(style: Record<string, string>): void {
    // Remove styles that don't translate well to Markdown
    const unnecessaryStyles = [
      'margin',
      'margin-top',
      'margin-bottom',
      'margin-left',
      'margin-right',
      'padding',
      'padding-top',
      'padding-bottom',
      'padding-left',
      'padding-right',
      'line-height',
      'font-family',
      'font-size',
      'color',
      'background-color',
      'border',
      'border-top',
      'border-bottom',
      'border-left',
      'border-right',
      'width',
      'height',
      'display',
      'position',
      'top',
      'left',
      'right',
      'bottom',
      'z-index',
      'overflow',
      'text-align',
      'vertical-align'
    ];

    unnecessaryStyles.forEach(prop => {
      delete style[prop];
    });
  }

  private styleToString(style: Record<string, string>): string {
    return Object.entries(style)
      .map(([key, value]) => `${key}: ${value}`)
      .join('; ');
  }
}