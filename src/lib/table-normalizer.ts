/**
 * Utility functions to normalize table content for consistent line numbering
 * and formatting when saving/loading from localStorage
 */

/**
 * Normalizes table rows to ensure consistent formatting
 * @param markdown The markdown content to normalize
 * @returns Normalized markdown content
 */
export function normalizeTableContent(markdown: string): string {
  const lines = markdown.split('\n')
  const normalizedLines: string[] = []
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    
    if (isTableLine(line)) {
      // Ensure table line starts and ends with |
      let normalizedLine = line
      
      if (!trimmedLine.startsWith('|')) {
        normalizedLine = '|' + trimmedLine
      }
      
      // Check the normalized line (not original) for ending |
      const finalTrimmed = normalizedLine.trim()
      if (!finalTrimmed.endsWith('|')) {
        normalizedLine = finalTrimmed + '|'
      }
      
      normalizedLines.push(normalizedLine)
    } else {
      // Keep regular lines as-is
      normalizedLines.push(line)
    }
  }
  
  return normalizedLines.join('\n')
}

/**
 * Detects if a line is part of a table structure
 * @param line The line to check
 * @returns True if the line is part of a table
 */
export function isTableLine(line: string): boolean {
  const trimmed = line.trim()
  
  // Check if line contains table pipes
  if (!trimmed.includes('|')) {
    return false
  }
  
  // Check if it's a table separator (alignment row)
  if (/^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(trimmed)) {
    return true
  }
  
  // Check if it's a table row (has content between pipes)
  const parts = trimmed.split('|')
  if (parts.length >= 2) {
    // Count non-empty cells
    const nonEmptyCells = parts.filter(part => part.trim() !== '').length
    return nonEmptyCells >= 1
  }
  
  return false
}

/**
 * Counts the actual logical lines in markdown content,
 * treating table rows as single lines regardless of visual wrapping
 * @param markdown The markdown content
 * @returns The number of logical lines
 */
export function countLogicalLines(markdown: string): number {
  return markdown.split('\n').length
}

/**
 * Estimates visual lines for table content, accounting for potential wrapping
 * @param tableRow The table row content
 * @param availableWidth Available width for rendering
 * @param context Canvas context for text measurement
 * @returns Estimated number of visual lines
 */
export function estimateTableRowVisualLines(
  line: string,
  containerWidth: number,
  context: CanvasRenderingContext2D
): number {
  // For table lines, use simple text width measurement
  // This is more reliable than trying to calculate cell-by-cell
  const textWidth = context.measureText(line).width
  const wrappedLines = Math.max(1, Math.ceil(textWidth / containerWidth))
  
  // Limit to reasonable number of lines for a single table row
  return Math.min(wrappedLines, 3)
}