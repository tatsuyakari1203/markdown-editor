import { visit } from 'unist-util-visit';
import type { Node, Element } from 'hast';
import { BaseProcessor } from './base-processor';
import { isElement, isCell, hasChildren } from '../type-guards';

/**
 * Process tables from Google Docs HTML to ensure proper structure
 * and compatibility with Markdown table conversion.
 */
export class TableProcessor extends BaseProcessor {
  process(tree: Node): void {
    this.processTables(tree);
  }

  private processTables(node: Node): void {
    visit(node, this.isTable, (tableNode: Element) => {
      try {
        this.normalizeTableStructure(tableNode);
        this.cleanupTableCells(tableNode);
      } catch (error) {
        this.logError('Failed to process table', error as Error);
      }
    });
  }

  private isTable = (node: Node): node is Element => {
    return isElement(node) && node.tagName === 'table';
  };

  private normalizeTableStructure(tableNode: Element): void {
    if (!hasChildren(tableNode)) return;

    // Ensure table has proper structure (thead, tbody)
    let hasHead = false;
    let hasBody = false;

    for (const child of tableNode.children) {
      if (isElement(child)) {
        if (child.tagName === 'thead') hasHead = true;
        if (child.tagName === 'tbody') hasBody = true;
      }
    }

    // If no thead/tbody, wrap all tr elements in tbody
    if (!hasHead && !hasBody) {
      const rows = tableNode.children.filter(
        child => isElement(child) && child.tagName === 'tr'
      );

      if (rows.length > 0) {
        const tbody: Element = {
          type: 'element',
          tagName: 'tbody',
          properties: {},
          children: rows
        };

        // Remove tr elements from table and add tbody
        tableNode.children = tableNode.children.filter(
          child => !(isElement(child) && child.tagName === 'tr')
        );
        tableNode.children.push(tbody);
      }
    }
  }

  private cleanupTableCells(tableNode: Element): void {
    visit(tableNode, isCell, (cellNode: Element) => {
      this.cleanupCellContent(cellNode);
      this.normalizeCellAttributes(cellNode);
    });
  }

  private cleanupCellContent(cellNode: Element): void {
    if (!hasChildren(cellNode)) return;

    // Remove empty paragraphs that Google Docs often adds
    cellNode.children = cellNode.children.filter(child => {
      if (isElement(child) && child.tagName === 'p') {
        if (!hasChildren(child) || child.children.length === 0) {
          return false;
        }
        // Check if paragraph only contains whitespace
        const textContent = this.getTextContent(child);
        return textContent.trim().length > 0;
      }
      return true;
    });
  }

  private normalizeCellAttributes(cellNode: Element): void {
    if (!cellNode.properties) return;

    // Clean up unnecessary attributes
    const unnecessaryAttrs = [
      'style',
      'class',
      'width',
      'height',
      'bgcolor',
      'align',
      'valign'
    ];

    unnecessaryAttrs.forEach(attr => {
      delete cellNode.properties![attr];
    });

    // Preserve important attributes like colspan, rowspan
    const importantAttrs = ['colspan', 'rowspan'];
    const preservedProps: Record<string, any> = {};
    
    importantAttrs.forEach(attr => {
      if (cellNode.properties![attr]) {
        preservedProps[attr] = cellNode.properties![attr];
      }
    });

    cellNode.properties = preservedProps;
  }

  private getTextContent(node: Node): string {
    if (node.type === 'text') {
      return (node as any).value;
    }
    
    if (hasChildren(node)) {
      return node.children.map(child => this.getTextContent(child)).join('');
    }
    
    return '';
  }
}