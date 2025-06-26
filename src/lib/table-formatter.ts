import type { Plugin } from 'unified';
import type { Node } from 'mdast';
import { visit } from 'unist-util-visit';

/**
 * A remark plugin to improve table formatting in markdown output.
 * This plugin processes table nodes to ensure consistent column widths
 * and proper alignment indicators.
 */
const tableFormatter: Plugin<[], Node, Node> = () => {
  return (tree: Node) => {
    visit(tree, 'table', (node: any) => {
      if (!node.children || node.children.length === 0) return;

      const rows = node.children;
      const numColumns = Math.max(...rows.map((row: any) => row.children?.length || 0));
      
      // Calculate maximum width for each column
      const columnWidths: number[] = new Array(numColumns).fill(0);
      
      rows.forEach((row: any) => {
        if (row.children) {
          row.children.forEach((cell: any, colIndex: number) => {
            const cellText = getCellText(cell);
            columnWidths[colIndex] = Math.max(
              columnWidths[colIndex] || 0,
              cellText.length,
              3 // minimum width
            );
          });
        }
      });

      // Process each row to ensure consistent formatting
      rows.forEach((row: any, rowIndex: number) => {
        if (row.children) {
          // Ensure all rows have the same number of columns
          while (row.children.length < numColumns) {
            row.children.push({
              type: 'tableCell',
              children: [{ type: 'text', value: '' }]
            });
          }

          // Format each cell
          row.children.forEach((cell: any, colIndex: number) => {
            const cellText = getCellText(cell);
            const paddedText = cellText.padEnd(columnWidths[colIndex]);
            
            // Replace cell content with padded text
            cell.children = [{ type: 'text', value: paddedText }];
          });
        }
      });

      // Ensure alignment row exists and is properly formatted
      if (rows.length >= 2 && rows[1].type === 'tableRow') {
        const alignmentRow = rows[1];
        if (alignmentRow.children) {
          alignmentRow.children.forEach((cell: any, colIndex: number) => {
            const align = cell.align || 'left';
            let alignmentText = '';
            
            switch (align) {
              case 'center':
                alignmentText = ':' + '-'.repeat(Math.max(columnWidths[colIndex] - 2, 1)) + ':';
                break;
              case 'right':
                alignmentText = '-'.repeat(Math.max(columnWidths[colIndex] - 1, 1)) + ':';
                break;
              default: // left
                alignmentText = '-'.repeat(columnWidths[colIndex]);
            }
            
            cell.children = [{ type: 'text', value: alignmentText }];
          });
        }
      }
    });

    return tree;
  };
};

/**
 * Extract text content from a table cell
 */
function getCellText(cell: any): string {
  if (!cell.children) return '';
  
  return cell.children
    .map((child: any) => {
      if (child.type === 'text') {
        return child.value || '';
      }
      if (child.children) {
        return getCellText(child);
      }
      return '';
    })
    .join('')
    .trim();
}

export default tableFormatter;