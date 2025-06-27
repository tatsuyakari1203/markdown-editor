// browser APIs -- reduces bundle size by ~200 kB!
import parse from 'rehype-dom-parse';
import { defaultHandlers } from 'hast-util-to-mdast';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import stringify from 'remark-stringify';
import { unified } from 'unified';
import GithubSlugger from 'github-slugger';
import type { Element, Node as HastNode } from 'hast';
import type { Node as MdastNode, Heading, Html } from 'mdast';
import type { State } from 'mdast-util-to-markdown';
import type { Handle } from 'hast-util-to-mdast';
import type { VFile } from 'vfile';
import type { Plugin, Processor } from 'unified';
import { updateHtmlWithSliceClip, fixGoogleHtml, type ConversionOptions, type VFileWithData } from './fix-google-html.ts';
import { getHastTextContent } from './hast-tools.ts';
// import logTree from './log-tree.ts';
import rehype2remarkWithSpaces from './rehype-to-remark-with-spaces.ts';
import tableFormatter from './table-formatter.ts';
import type { SliceClip } from './slice-clip.ts';

// Type definitions
export interface ProcessorOptions extends ConversionOptions {
  codeBlocks?: 'indented' | 'fenced';
  headingIds?: 'hidden' | 'html' | 'extended';
  suggestions?: 'show' | 'hide' | 'accept' | 'reject';
}

export interface ExtendedState extends State {
  elementById: Map<string, Element>;
}

export interface SliceClipWrapper {
  data: string | SliceClip;
}

export const defaultOptions: ProcessorOptions = {
  codeBlocks: 'indented',
  headingIds: 'hidden',
  suggestions: 'reject',
};

/**
 * Handler that preserves the original tag and converts its contents.
 */
const preserveTagAndConvertContents: Handle = (state, node) => {
  if (node.type !== 'element') {
    throw new Error('Expected element node');
  }
  
  return [
    { type: 'html', value: `<${node.tagName}>` } as Html,
    ...state.all(node),
    { type: 'html', value: `</${node.tagName}>` } as Html,
  ];
};

/**
 * Adds support for marking up a heading's ID in various formats.
 */
function headingWithIdHandler(options: ProcessorOptions): Handle {
  return function headingToMdast(state, node) {
    if (node.type !== 'element' || !/^h[1-6]$/.test(node.tagName)) {
      throw new Error('Expected heading element');
    }

    const newNode = defaultHandlers[node.tagName]!(state, node) as Heading;

    if (node.properties?.id && typeof node.properties.id === 'string') {
      let idCode = '';
      if (options.headingIds === 'html') {
        idCode = `<a id="${node.properties.id}"></a>`;
      } else if (options.headingIds === 'extended') {
        idCode = ` {#${node.properties.id}}`;
      }

      if (idCode) {
        if (!newNode.children) {
          newNode.children = [];
        }
        newNode.children.push({
          type: 'html',
          value: idCode,
        } as Html);
      }
    }

    return newNode;
  };
}

/**
 * Create a handler for `<a>` elements. The default handler is pretty basic,
 * and this adds support for linking to headings by slug (instead of ID) and
 * for bookmarks (anchors that are the target of other links in the doc).
 */
function anchorHandler(options: ProcessorOptions): Handle {
  const slugger = new GithubSlugger();

  return function anchorToMdast(state, node) {
    if (node.type !== 'element' || node.tagName !== 'a') {
      throw new Error('Expected anchor element');
    }

    const anchorName = node.properties?.id || node.properties?.name;
    if (anchorName && !node.properties?.href) {
      // The default handler does not preserve anchors that are targets, but we
      // need them to implement bookmarks from Google Docs.
      return [{ type: 'html', value: `<a id="${anchorName}"></a>` } as Html];
    } else {
      // Links to headings
      let href = node.properties?.href as string;
      if (href?.startsWith('#')) {
        const extendedState = state as unknown as ExtendedState;
        const target = extendedState.elementById?.get(href.slice(1));
        if (target && /^h\d$/.test(target.tagName) && options.headingIds === 'hidden') {
          const headingSlug = slugger.slug(getHastTextContent(target));
          if (!node.properties) {
            node.properties = {};
          }
          node.properties.href = `#${headingSlug}`;
        }
      }

      const defaultHandler = defaultHandlers['a'];
      if (!defaultHandler) {
        throw new Error('No default handler for anchor elements');
      }
      return defaultHandler(state, node);
    }
  };
}

/**
 * Use two blank lines before headings. This is a "join" function, which tells
 * remark-stringify how to join adjacent nodes.
 */
function doubleBlankLinesBeforeHeadings(
  previous: MdastNode,
  next: MdastNode,
  _parent: MdastNode,
  _state: State
): boolean | number | void {
  if (previous.type !== 'heading' && next.type === 'heading') {
    return 2;
  }
  return undefined;
}

/**
 * Custom join function for better table formatting
 */
function tableJoin(
  previous: MdastNode,
  next: MdastNode,
  parent: MdastNode,
  state: any
): boolean | number | void {
  // Add blank line before tables for better readability
  if (previous.type !== 'table' && next.type === 'table') {
    return 1;
  }
  // Add blank line after tables
  if (previous.type === 'table' && next.type !== 'table') {
    return 1;
  }
  return undefined;
}

function createProcessor(
  options: ProcessorOptions,
  converter: ((tree: HastNode, fileData?: any) => void) | Plugin<[], HastNode, HastNode> = fixGoogleHtml
): Processor<HastNode, HastNode, HastNode, MdastNode, string> {
  const headingWithId = headingWithIdHandler(options);

  // Create a wrapper plugin for the converter function
  const converterPlugin: Plugin<[], HastNode, HastNode> = () => {
    return (tree: HastNode, file: VFile) => {
      if (typeof converter === 'function') {
        (converter as (tree: HastNode, fileData?: any) => void)(tree, file.data);
      }
    };
  };

  const actualConverter = typeof converter === 'function' ? converterPlugin : converter;

  return unified()
    .use(parse)
    .use(actualConverter)
    .use(rehype2remarkWithSpaces, {
      handlers: {
        // Preserve sup/sub markup; most Markdowns have no markup for it.
        sub: preserveTagAndConvertContents,
        sup: preserveTagAndConvertContents,
        ins: preserveTagAndConvertContents,
        h1: headingWithId,
        h2: headingWithId,
        h3: headingWithId,
        h4: headingWithId,
        h5: headingWithId,
        h6: headingWithId,
        a: anchorHandler(options),
      },
    })
    .use(remarkGfm)
    // .use(tableFormatter) // Temporarily disabled to debug
    .use(stringify, {
      bullet: '-',
      emphasis: '_',
      fences: options.codeBlocks === 'fenced',
      listItemIndent: 'one',
      strong: '*',
      join: [doubleBlankLinesBeforeHeadings, tableJoin],
      tableCellPadding: true,
      tablePipeAlign: false,
    } as any);
}

/**
 * Parse a Google Docs Slice Clip (the Google Docs internal format for
 * representing copied documents or selections from a document). This parses a
 * string representing the document and unwraps it if enclosed in a wrapper
 * object. You can pass in a string or object.
 */
function parseGdocsSliceClip(raw: string | SliceClipWrapper | SliceClip): SliceClip {
  let wrapper: SliceClipWrapper | SliceClip;
  
  if (typeof raw === 'string') {
    try {
      wrapper = JSON.parse(raw) as SliceClipWrapper | SliceClip;
    } catch (error) {
      throw new SyntaxError(`Invalid JSON in slice clip: ${error}`);
    }
  } else {
    wrapper = raw;
  }

  let data: SliceClip;
  if ('data' in wrapper && wrapper.data) {
    if (typeof wrapper.data === 'string') {
      try {
        data = JSON.parse(wrapper.data) as SliceClip;
      } catch (error) {
        throw new SyntaxError(`Invalid JSON in slice clip data: ${error}`);
      }
    } else {
      data = wrapper.data;
    }
  } else {
    data = wrapper as SliceClip;
  }

  // Do a basic check to ensure we are dealing with what we think we are. This
  // is not meant to be exhaustive or to check the exact schema.
  if (
    typeof data?.resolved?.dsl_entitypositionmap !== 'object' ||
    typeof data?.resolved?.dsl_spacers !== 'string' ||
    !Array.isArray(data?.resolved?.dsl_styleslices)
  ) {
    throw new SyntaxError(
      `Document does not appear to be a GDocs Slice Clip: ${JSON.stringify(raw)}`
    );
  }

  return data;
}

/**
 * Convert Google Docs HTML to Markdown.
 */
export async function convertDocsHtmlToMarkdown(
  html: string,
  rawSliceClip?: string | SliceClipWrapper | SliceClip,
  options?: Partial<ProcessorOptions>
): Promise<string> {
  const mergedOptions: ProcessorOptions = { ...defaultOptions, ...options };

  let processedHtml = html;
  if (rawSliceClip) {
    processedHtml = await combineGoogleDocFormats(html, rawSliceClip);
  }

  const result = await createProcessor(mergedOptions).process({
    value: processedHtml,
    data: { options: mergedOptions },
  } as VFileWithData);

  return String(result.value);
}

/**
 * Combine Google Doc HTML with slice clip data.
 */
export async function combineGoogleDocFormats(
  html: string,
  rawSliceClip: string | SliceClipWrapper | SliceClip
): Promise<string> {
  const sliceClip = rawSliceClip ? parseGdocsSliceClip(rawSliceClip) : null;

  const result = await unified()
    .use(parse)
    .use(updateHtmlWithSliceClip)
    .use(rehypeStringify)
    .process({
      value: html,
      data: { sliceClip },
    } as VFileWithData);

  return String(result.value);
}