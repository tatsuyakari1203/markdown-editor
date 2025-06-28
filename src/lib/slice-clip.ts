/**
 * Tools for working with Google Docs Slice Clips (GDocs's internal pasteboard
 * format).
 */

import { CONTINUE, EXIT, visitParents } from 'unist-util-visit-parents';
import type { Node, Parent, Text } from 'hast';

// Type definitions for Google Docs Slice Clip structures
export interface GDocsRange {
  start: number;
  end: number;
  suggestionId?: string;
  type?: 'insertion' | 'deletion';
  codeBlock?: {
    id: string;
    language: string | null;
    text: string;
  };
  bookmark?: string;
}

export interface HeadingInfo {
  start: number;
  end: number;
  text: string;
  level: number;
  id: string;
}

export interface StyleSlice {
  stsl_type: string;
  stsl_styles: any[];
}

export interface CodeStyle {
  cos_l: string;
}

export interface ParagraphStyle {
  ps_hd?: number;
  ps_hdid?: string;
}

export interface SliceClipResolved {
  dsl_spacers: string;
  dsl_styleslices: StyleSlice[];
  dsl_suggestedinsertions?: {
    sgsl_sugg: (string[] | null)[];
  };
  dsl_suggesteddeletions?: {
    sgsl_sugg: (string[] | null)[];
  };
  dsl_entitypositionmap?: {
    bookmark?: (string[] | null)[];
  };
}

export interface SliceClip {
  resolved: SliceClipResolved;
}

export interface VisitorContext {
  node: Text;
  nodeIndex: number;
  parent: Parent;
  parents: Parent[];
  range: GDocsRange;
  rangeStart: number;
  rangeEnd: number;
}

export type RangeVisitor = (context: VisitorContext) => void;
export type RangeReplacer = (range: GDocsRange, text: string) => Node | null;

// Type guards
const isText = (node: Node): node is Text => node.type === 'text';

export function getStyles(sliceClip: SliceClip, styleType: string): any[] {
  const styleSlice = sliceClip.resolved.dsl_styleslices.find(
    (slice) => slice.stsl_type === styleType
  );
  return styleSlice ? styleSlice.stsl_styles : [];
}

/**
 * Get the plain text of the slice clip.
 */
export function sliceClipText(sliceClip: SliceClip): string {
  return sliceClip.resolved.dsl_spacers;
}

/**
 * Create a set of range objects to represent the location of suggested changes
 * in the text based on data from a Slice Clip object.
 *
 * In the slice clip, ranges are represented by a large array, where each index
 * indicates a location in the text. If the value is an array, it will be an
 * array of suggestion IDs for suggestions that start (or continue) at that
 * location in the text. If a currently open suggestion is not listed in the
 * value, the location marks the end of that suggestion.
 *
 * For exampled, suggestion 'a' starts at index 2 and ends at 7; 'b' starts at
 * index 2 and ends at 5:
 *
 *   [[], null, ['a', 'b'], null, null, ['a'], null, []]
 */
export function rangesForSuggestions(
  sliceClip: SliceClip,
  type: 'insertion' | 'deletion'
): GDocsRange[] {
  const text = sliceClip.resolved.dsl_spacers;
  const suggestionsKey = type === 'insertion' ? 'dsl_suggestedinsertions' : 'dsl_suggesteddeletions';
  const suggestions = sliceClip.resolved[suggestionsKey];
  
  if (!suggestions) {
    return [];
  }
  
  const locations = suggestions.sgsl_sugg;

  const ranges: GDocsRange[] = [];
  let openRanges: GDocsRange[] = [];
  
  for (let i = 0; i < locations.length; i++) {
    const value = locations[i];
    if (value != null) {
      for (const range of openRanges) {
        range.end = i;
      }
      openRanges = [];

      for (const suggestionId of value) {
        const range: GDocsRange = { suggestionId, type, start: i, end: i };
        ranges.push(range);
        openRanges.push(range);
      }
    }
  }

  for (const range of openRanges) {
    range.end = text.length;
  }

  return ranges;
}

/**
 * Create a set of range objects representing the location of code snippet
 * objects in the text based on the slice clip data.
 *
 * Ranges have an extra `codeBlock` object with an `id`, `language`, and `text`.
 *
 * In the slice clip, code blocks are stored as `code_snippet` style slices.
 * The objects in the slice are at the index of the start of the block. In the
 * raw text, the start of a block is identified by a `\uec03` and the end by a
 * `\uec02` character.
 */
export function rangesForCodeSnippets(sliceClip: SliceClip): GDocsRange[] {
  const ranges: GDocsRange[] = [];
  const codeStyles = getStyles(sliceClip, 'code_snippet') as CodeStyle[];
  if (!codeStyles.length) return ranges;

  const docsText = sliceClipText(sliceClip);
  let codeBlockId = 0;
  let match: RegExpExecArray | null;
  const matcher = /\uec03([^\uec02]*)\uec02/g;
  
  while ((match = matcher.exec(docsText))) {
    // Trim the end to remove any trailing line breaks or spaces.
    const text = match[1].trimEnd();
    const style = codeStyles[match.index];
    let language: string | null = style?.cos_l?.toLowerCase() || null;
    if (language === 'unset') language = null;

    ranges.push({
      start: match.index + 1,
      end: match.index + text.length,
      codeBlock: {
        id: `code-${codeBlockId++}`,
        language,
        text,
      },
    });
  }

  return ranges;
}

/**
 * Get information about all the headings in the slice clip.
 */
export function getHeadings(sliceClip: SliceClip): HeadingInfo[] {
  const headings: HeadingInfo[] = [];
  const paragraphStyles = getStyles(sliceClip, 'paragraph') as ParagraphStyle[];

  // Paragraph styles have objects at the index of the paragraph's *end*.
  // It appears all text is expected to be in a paragraph, so the end of one
  // implicitly begins another.
  let current = { start: 0 };
  
  for (let i = 0; i < paragraphStyles.length; i++) {
    const style = paragraphStyles[i];
    if (style == null) continue;

    // Titles have `ps_hd = 100`, so confine ouselves to normal heading levels.
    if (style.ps_hdid && style.ps_hd && style.ps_hd < 7) {
      const text = sliceClipText(sliceClip).slice(current.start, i);
      headings.push({
        ...current,
        end: i,
        text,
        level: style.ps_hd,
        id: style.ps_hdid,
      });
    }

    // The next character after a paragraph is a line break; skip it.
    current = { start: i + 1 };
  }

  return headings;
}

/**
 * Get the IDs and locations of all the bookmarks in a slice clip.
 */
export function getBookmarks(sliceClip: SliceClip): { ids: Set<string>; ranges: GDocsRange[] } {
  const ids = new Set<string>();
  const ranges: GDocsRange[] = [];
  const positionMap = sliceClip?.resolved?.dsl_entitypositionmap?.bookmark;

  if (positionMap) {
    for (let i = 0; i < positionMap.length; i++) {
      const bookmarkIds = positionMap[i];
      if (bookmarkIds != null) {
        for (const id of bookmarkIds) {
          ids.add(id);
          ranges.push({ bookmark: id, start: i, end: i });
        }
      }
    }
  }

  return { ids, ranges };
}

function indexOfNextNonSpace(docsText: string, startIndex = 0): number {
  const match = docsText.slice(startIndex).match(/^[\s\uec02-\uec03]*/);
  return startIndex + (match ? match[0].length : 0);
}

/**
 * Visit each range of text as found in a HAST tree. You can replace or change
 * the node from within the visitor and it should continue to work.
 *
 * WARNING: the overall *text content* of the tree must remain the same,
 * otherwise work will stop early because the tree can no longer be matched
 * up to the appropriate locations in the document. If you need to modify the
 * text itself, wrap the text in a new node, and then visit those nodes in a
 * second pass to update their text children.
 */
export function visitRangesInTree(
  docsText: string,
  ranges: GDocsRange[],
  tree: Node,
  visitor: RangeVisitor
): void {
  if (ranges.length === 0) return;

  ranges = ranges.slice().sort((a, b) => a.start - b.start);

  // Line breaks and various space characters may be represented by elements
  // in the HAST tree instead of being literally present as text. However,
  // Non-space characters should always be preserved in HAST text nodes.
  //
  // Keep track of the location of the next non-space character so we can match
  // the HAST tree against that rather than the literal text of the GDoc.
  let currentIndex = 0;
  let currentNonspaceIndex = indexOfNextNonSpace(docsText, currentIndex);

  visitParents(tree, isText, (node, parents) => {
    const parent = parents[parents.length - 1] as Parent;
    const nodeIndex = parent ? parent.children.indexOf(node) : -1;

    const leadingSpaces = node.value.match(/^\s*/);
    const leadingSpacesLength = leadingSpaces ? leadingSpaces[0].length : 0;
    const text = node.value.slice(leadingSpacesLength);

    const endIndex = currentNonspaceIndex + text.length;
    const expectedText = docsText.slice(currentNonspaceIndex, endIndex);

    if (expectedText !== text) {
      // Text mismatch detected - stopping traversal
      return EXIT;
    }

    if (ranges[0] && ranges[0].start < endIndex) {
      const range = ranges.shift()!;
      const startInText = range.start - currentNonspaceIndex;
      const endInText = range.end - currentNonspaceIndex;
      const rangeStart = Math.max(leadingSpacesLength + startInText, 0);
      let rangeEnd = Math.max(leadingSpacesLength + endInText, 0);

      // If the range extends into another node chop it up and put the
      // remainder back on the list of ranges to handle.
      const overreach = range.end - endIndex;
      if (overreach > 0) {
        rangeEnd = endIndex;

        const remainder: GDocsRange = { ...range, start: endIndex };
        const point = ranges.findIndex((r) => r.start >= remainder.start);
        if (point < 0) {
          ranges.push(remainder);
        } else {
          ranges.splice(point, 0, remainder);
        }
      }

      visitor({
        node,
        nodeIndex,
        parent,
        parents,
        range,
        rangeStart,
        rangeEnd,
      });

      if (ranges.length === 0) {
        return EXIT;
      } else {
        // The next range could also be in this node, so re-visit it.
        return [CONTINUE, nodeIndex];
      }
    } else {
      currentIndex = endIndex;
      currentNonspaceIndex = indexOfNextNonSpace(docsText, currentIndex);
    }
  });
}

/**
 * Replace each range of text (from the original Google Doc) in a HAST tree
 * with a new node.
 *
 * WARNING: the overall *text content* of the tree must remain the same,
 * otherwise work will stop early because the tree can no longer be matched
 * up to the appropriate locations in the document. If you need to modify the
 * text itself, wrap the text in a new node, and then visit those nodes in a
 * second pass to update their text children.
 */
export function replaceRangesInTree(
  docsText: string,
  ranges: GDocsRange[],
  node: Node,
  replacer: RangeReplacer
): void {
  visitRangesInTree(
    docsText,
    ranges,
    node,
    ({ node, nodeIndex, parent, range, rangeStart, rangeEnd }) => {
      const textBefore = node.value.slice(0, rangeStart);
      const textInside = node.value.slice(rangeStart, rangeEnd);
      const textAfter = node.value.slice(rangeEnd);

      const newNodes: any[] = [];
      if (textBefore.length) {
        newNodes.push({ type: 'text', value: textBefore });
      }

      const replacement = replacer(range, textInside);
      if (replacement) {
        newNodes.push(replacement);
      }

      if (textAfter.length) {
        newNodes.push({ type: 'text', value: textAfter });
      }

      parent.children.splice(nodeIndex, 1, ...newNodes);
    }
  );
}