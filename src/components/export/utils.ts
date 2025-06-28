import { ExportOptions } from './types'
import { PRINT_CSS_TEMPLATE, SMART_PAGE_BREAK_SCRIPT } from './constants'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkToc from 'remark-toc'
import remarkWikiLink from 'remark-wiki-link'
import remarkRehype from 'remark-rehype'
import rehypeRaw from 'rehype-raw'
import rehypeKatex from 'rehype-katex'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeHighlight from 'rehype-highlight'
import rehypeStringify from 'rehype-stringify'
import rehypeSanitize from 'rehype-sanitize'
import { defaultSchema } from 'hast-util-sanitize'
// Utility functions for export functionality
export const createPrintIframe = (url: string, onComplete: () => void) => {
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;'
  document.body.appendChild(iframe)
  
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.print()
      setTimeout(() => {
        document.body.removeChild(iframe)
        onComplete()
      }, 1000)
    }, 500)
  }
  
  iframe.src = url
}

export const downloadFile = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export const getFileName = (pageTitle: string, extension: string) => 
  `${pageTitle.toLowerCase().replace(/\s+/g, '-')}.${extension}`

// Process markdown with enhanced features
export const processMarkdownWithFeatures = async (markdown: string) => {
  // Create a custom schema that allows KaTeX elements
  const katexSchema = {
    ...defaultSchema,
    tagNames: [
      ...defaultSchema.tagNames || [],
      'math',
      'semantics',
      'mrow',
      'mi',
      'mo',
      'mn',
      'mfrac',
      'msup',
      'msub',
      'msubsup',
      'msqrt',
      'mroot',
      'mtext',
      'mspace',
      'mtable',
      'mtr',
      'mtd',
      'mover',
      'munder',
      'munderover',
      'menclose',
      'annotation'
    ],
    attributes: {
      ...defaultSchema.attributes,
      '*': [
        ...(defaultSchema.attributes?.['*'] || []),
        'className',
        'style'
      ],
      math: ['xmlns', 'display'],
      semantics: [],
      mrow: [],
      mi: ['mathvariant'],
      mo: ['stretchy', 'fence', 'separator', 'lspace', 'rspace'],
      mn: [],
      mfrac: ['linethickness'],
      msup: [],
      msub: [],
      msubsup: [],
      msqrt: [],
      mroot: [],
      mtext: [],
      mspace: ['width', 'height', 'depth'],
      mtable: ['columnalign', 'rowalign'],
      mtr: [],
      mtd: ['columnspan', 'rowspan'],
      mover: ['accent'],
      munder: ['accentunder'],
      munderover: ['accent', 'accentunder'],
      menclose: ['notation'],
      annotation: ['encoding'],
      // Allow highlight.js classes
      code: [...(defaultSchema.attributes?.code || []), 'className'],
      span: [...(defaultSchema.attributes?.span || []), 'className'],
      pre: [...(defaultSchema.attributes?.pre || []), 'className']
    }
  }

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkToc)
    .use(remarkWikiLink, {
      pageResolver: (name: string) => [name.replace(/ /g, '_').toLowerCase()],
      hrefTemplate: (permalink: string) => `#/page/${permalink}`,
      wikiLinkClassName: 'wiki-link',
      newClassName: 'wiki-link-new'
    })
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      behavior: 'wrap',
      properties: {
        className: ['anchor']
      }
    })
    .use(rehypeKatex)
    .use(rehypeHighlight)
    .use(rehypeSanitize, katexSchema)
    .use(rehypeStringify)

  const result = await processor.process(markdown)
  return String(result)
}

export const getMarkdownFeaturesCSS = (isDark: boolean) => {
  return `
    /* Table of Contents Styles */
    .markdown-preview-content h2:has(+ ul:first-of-type) {
      margin-bottom: 1.25rem;
      font-size: 1.15rem;
      font-weight: 600;
      letter-spacing: 0.025em;
      line-height: 1.3;
    }
    
    .markdown-preview-content h2:has(+ ul:first-of-type) + ul {
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 2rem;
      list-style: none;
      background-color: ${isDark ? 'rgba(15, 23, 42, 0.4)' : 'rgba(248, 250, 252, 0.7)'};
      border: 1px solid ${isDark ? 'rgba(51, 65, 85, 0.25)' : 'rgba(226, 232, 240, 0.6)'};
    }
    
    .markdown-preview-content h2:has(+ ul:first-of-type) + ul li {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    
    .markdown-preview-content h2:has(+ ul:first-of-type) + ul a {
      display: block;
      padding: 8px 14px;
      margin: 2px 0;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      font-size: 1rem;
      line-height: 1.4;
      letter-spacing: 0.01em;
      transition: color 0.15s ease;
      color: ${isDark ? 'rgb(203, 213, 225)' : 'rgb(51, 65, 85)'};
    }
    
    .markdown-preview-content h2:has(+ ul:first-of-type) + ul a:hover {
      color: ${isDark ? 'rgb(226, 232, 240)' : 'rgb(30, 41, 59)'};
    }
    
    .markdown-preview-content h2:has(+ ul:first-of-type) + ul ul {
      margin-left: 18px;
      padding-left: 0;
      border-left: 1px solid rgba(156, 163, 175, 0.3);
      background: transparent;
      padding: 0;
      margin-top: 3px;
      margin-bottom: 3px;
    }
    
    .markdown-preview-content h2:has(+ ul:first-of-type) + ul ul a {
      font-size: 0.95rem;
      font-weight: 500;
      padding: 6px 12px;
      opacity: 0.85;
      color: ${isDark ? 'rgb(156, 163, 175)' : 'rgb(75, 85, 99)'};
    }
    
    .markdown-preview-content h2:has(+ ul:first-of-type) + ul ul ul a {
      font-size: 0.9rem;
      font-weight: 450;
      padding: 5px 10px;
      opacity: 0.75;
      color: ${isDark ? 'rgb(107, 114, 128)' : 'rgb(107, 114, 128)'};
    }
    
    /* Wiki Link Styles */
    .wiki-link {
      display: inline-flex;
      align-items: center;
      padding: 0.125rem 0.25rem;
      border-radius: 0.25rem;
      font-size: 0.875rem;
      border: 1px solid;
      transition: opacity 0.2s;
      text-decoration: none;
    }
    
    .wiki-link:hover {
      opacity: 0.8;
    }
    
    /* Existing wiki links */
    .wiki-link:not(.wiki-link-new) {
      color: ${isDark ? 'rgb(96, 165, 250)' : 'rgb(37, 99, 235)'};
      background-color: ${isDark ? 'rgba(30, 58, 138, 0.2)' : 'rgb(239, 246, 255)'};
      border-color: ${isDark ? 'rgba(29, 78, 216, 0.5)' : 'rgb(191, 219, 254)'};
    }
    
    /* New wiki links */
    .wiki-link.wiki-link-new {
      color: ${isDark ? 'rgb(248, 113, 113)' : 'rgb(220, 38, 38)'};
      background-color: ${isDark ? 'rgba(127, 29, 29, 0.2)' : 'rgb(254, 242, 242)'};
      border-color: ${isDark ? 'rgba(185, 28, 28, 0.5)' : 'rgb(254, 202, 202)'};
    }
    
    /* Heading Link Styles */
    .heading-link {
      text-decoration: none;
    }
    
    /* Minimal Flat Design Code Block Styles */
    .code-block-wrapper {
      margin: 1rem 0;
      border-radius: 4px;
      border: none;
      box-shadow: none;
      overflow: hidden;
      background: ${isDark ? '#1a1a1a' : '#f8f9fa'};
    }
    
    .code-block-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 12px;
      font-size: 11px;
      font-weight: 400;
      background: ${isDark ? '#1a1a1a' : '#f8f9fa'};
      border-bottom: 1px solid ${isDark ? '#2a2a2a' : '#e9ecef'};
      color: ${isDark ? '#a0a0a0' : '#6c757d'};
    }
    
    .code-block-copy {
      display: flex;
      align-items: center;
      gap: 3px;
      padding: 3px 6px;
      border-radius: 3px;
      transition: all 0.15s ease;
      background: transparent;
      border: none;
      cursor: pointer;
      color: ${isDark ? '#808080' : '#6c757d'};
      font-size: 10px;
    }
    
    .code-block-copy:hover {
      background: ${isDark ? '#2a2a2a' : '#e9ecef'};
      color: ${isDark ? '#ffffff' : '#495057'};
    }
    
    .code-block-content {
      background: ${isDark ? '#1a1a1a' : '#f8f9fa'};
    }
    
    /* Minimal Flat Syntax Highlighting */
    .syntax-highlighted pre {
      margin: 0 !important;
      border-radius: 0 0 4px 4px !important;
      font-size: 13px !important;
      line-height: 1.4 !important;
      padding: 12px !important;
      background: ${isDark ? '#1a1a1a' : '#f8f9fa'} !important;
      color: ${isDark ? '#e0e0e0' : '#212529'} !important;
      overflow-x: auto;
      border: none !important;
      box-shadow: none !important;
    }
    
    /* Force dark theme styling for all code elements */
    ${isDark ? `
    pre,
    pre code,
    code,
    .hljs,
    .syntax-highlighted pre,
    .syntax-highlighted code,
    pre[class*="language-"],
    code[class*="language-"],
    .highlight pre,
    .highlight code {
      background: #1a1a1a !important;
      color: #e0e0e0 !important;
    }
    
    /* Override any external syntax highlighting */
    .hljs-keyword { color: #ff6b6b !important; }
    .hljs-string { color: #51cf66 !important; }
    .hljs-comment { color: #868e96 !important; }
    .hljs-number { color: #ffd43b !important; }
    .hljs-function { color: #74c0fc !important; }
    .hljs-variable { color: #e0e0e0 !important; }
    ` : ''}
    
    .syntax-highlighted .linenumber {
      min-width: 2.5em;
      padding-right: 0.8em;
      color: ${isDark ? '#666666' : '#adb5bd'} !important;
      border-right: 1px solid ${isDark ? '#2a2a2a' : '#dee2e6'};
      margin-right: 0.8em;
      text-align: right;
      font-size: 11px;
    }
    
    /* KaTeX Math Styles */
    .katex {
      font-size: 1.1em;
      color: ${isDark ? '#e0e0e0' : '#1a1a1a'};
    }
    
    .katex-display {
      margin: 1em 0;
      text-align: center;
    }
    
    .katex-display > .katex {
      display: inline-block;
      white-space: nowrap;
      max-width: 100%;
      overflow-x: auto;
      text-align: initial;
    }
    
    .katex .katex-mathml {
      position: absolute;
      clip: rect(1px, 1px, 1px, 1px);
      padding: 0;
      border: 0;
      height: 1px;
      width: 1px;
      overflow: hidden;
    }
    `
}

export const getThemeCSS = (theme: string) => {
  switch (theme) {
    case 'github-light':
      return 'https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.8.1/github-markdown-light.min.css'
    case 'github-dark':
      return 'https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.8.1/github-markdown-dark.min.css'
    case 'minimal-light':
      return `
        /* Minimal Light Flat Design */
        body { 
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
          line-height: 1.6; 
          color: #212529; 
          margin: 0; 
          padding: 0;
          background: #ffffff;
        }
        
        /* Container styles for proper centering */
        .markdown-body, [class*="markdown"], article, main, section, div {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        
        /* Clean Typography */
        h1, h2, h3, h4, h5, h6 { 
          margin-top: 1.8rem; 
          margin-bottom: 0.8rem; 
          font-weight: 500; 
          line-height: 1.3;
          color: #000000;
        }
        p { 
          margin-bottom: 1rem; 
          word-wrap: break-word;
          color: #212529;
        }
        
        /* Minimal Flat Code Styles */
        code { 
          background: #f8f9fa; 
          padding: 0.15em 0.3em; 
          border-radius: 3px; 
          font-size: 85%; 
          word-wrap: break-word;
          color: #212529;
          border: none;
        }
        pre { 
          background: #f8f9fa; 
          padding: 0.8rem; 
          border-radius: 4px; 
          overflow-x: auto; 
          word-wrap: break-word;
          white-space: pre-wrap;
          color: #212529;
          border: none;
          box-shadow: none;
          margin: 1rem 0;
        }
        
        /* Other elements */
        blockquote { 
          border-left: 4px solid #dfe2e5; 
          padding-left: 1rem; 
          margin: 1rem 0; 
          color: #6a737d; 
        }
        table { 
          border-collapse: collapse; 
          width: 100%; 
          margin: 1rem 0; 
          overflow-x: auto;
          display: block;
          white-space: nowrap;
        }
        th, td { 
          border: 1px solid #dfe2e5; 
          padding: 0.5rem 1rem; 
          text-align: left; 
        }
        th { 
          background: #f6f8fa; 
          font-weight: 600; 
        }
        
        /* Responsive design */
        @media (max-width: 768px) {
          .markdown-body, [class*="markdown"], article, main, section, div {
            padding: 1rem;
          }
        }
        `
    case 'minimal-dark':
      return `
        /* Minimal Dark Flat Design */
        body { 
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
          line-height: 1.6; 
          color: #e0e0e0; 
          background: #121212; 
          margin: 0; 
          padding: 0;
        }
        
        /* Container styles for proper centering */
        .markdown-body, [class*="markdown"], article, main, section, div {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        
        /* Clean Typography */
        h1, h2, h3, h4, h5, h6 { 
          margin-top: 1.8rem; 
          margin-bottom: 0.8rem; 
          font-weight: 500; 
          color: #ffffff; 
          line-height: 1.3;
        }
        p { 
          margin-bottom: 1rem; 
          word-wrap: break-word;
          color: #e0e0e0;
        }
        
        /* Minimal Flat Code Styles */
        code { 
          background: #1a1a1a; 
          padding: 0.15em 0.3em; 
          border-radius: 3px; 
          font-size: 85%; 
          color: #e0e0e0; 
          word-wrap: break-word;
          border: none;
        }
        pre { 
          background: #1a1a1a; 
          padding: 0.8rem; 
          border-radius: 4px; 
          overflow-x: auto; 
          word-wrap: break-word;
          white-space: pre-wrap;
          color: #e0e0e0;
          border: none;
          box-shadow: none;
          margin: 1rem 0;
        }
        
        pre code {
          background: transparent;
          color: #e0e0e0;
          padding: 0;
        }
        
        /* Other elements */
        blockquote { 
          border-left: 4px solid #30363d; 
          padding-left: 1rem; 
          margin: 1rem 0; 
          color: #8b949e; 
        }
        table { 
          border-collapse: collapse; 
          width: 100%; 
          margin: 1rem 0; 
          overflow-x: auto;
          display: block;
          white-space: nowrap;
        }
        th, td { 
          border: 1px solid #30363d; 
          padding: 0.5rem 1rem; 
          text-align: left; 
        }
        th { 
          background: #21262d; 
          font-weight: 600; 
        }
        
        /* Responsive design */
        @media (max-width: 768px) {
          .markdown-body, [class*="markdown"], article, main, section, div {
            padding: 1rem;
          }
        }
        `
    default:
      return ''
  }
}

export const generateHTML = async (options: ExportOptions, toast: any, markdown?: string) => {
  let content: string
  
  if (markdown) {
    // Use the provided markdown and process it with enhanced features
    try {
      content = await processMarkdownWithFeatures(markdown)
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to process markdown with enhanced features",
        variant: "destructive",
      })
      return
    }
  } else {
    // Fallback to existing preview content
    const preview = document.querySelector('.markdown-preview-content')
    if (!preview) {
      toast({
        title: "Export failed",
        description: "Preview content not found",
        variant: "destructive",
      })
      return
    }
    content = preview.innerHTML
  }
  
  // Wrap content in container if specified
  if (options.useContainer) {
    const containerClass = options.containerClass ? ` class="${options.containerClass}"` : ''
    content = `<${options.containerType}${containerClass}>${content}</${options.containerType}>`
  } else {
    // For all themes without custom container, ensure proper centering with markdown-body class
    content = `<div class="markdown-body">${content}</div>`
  }

  if (options.exportFormat === 'html-standalone') {
    // Generate complete HTML document
    const metaTags = options.includeMetaTags ? `
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="Markdown Editor">` : ''
    
    const cssLink = options.includeCSS && options.theme !== 'custom' ? 
      (options.theme.startsWith('github') ? 
        `\n  <link rel="stylesheet" href="${getThemeCSS(options.theme)}">` :
        `\n  <style>${getThemeCSS(options.theme)}</style>`) : ''
    
    // Add enhanced markdown features CSS (includes syntax highlighting)
    const markdownFeaturesCSS = options.includeCSS ? 
      `\n  <style>${getMarkdownFeaturesCSS(options.theme.includes('dark'))}</style>` : ''
    
    // Add GitHub theme compatibility CSS
    const githubCompatCSS = options.includeCSS && options.theme.startsWith('github') ? `
  <style>
    /* GitHub theme compatibility */
    .markdown-body {
      box-sizing: border-box;
      min-width: 200px;
      max-width: 980px;
      margin: 0 auto;
      padding: 45px;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    
    @media (max-width: 767px) {
      .markdown-body {
        padding: 15px;
      }
    }
    
    /* Enhanced word wrapping for GitHub themes */
    .markdown-body p, 
    .markdown-body li, 
    .markdown-body td, 
    .markdown-body th {
      word-wrap: break-word;
      overflow-wrap: break-word;
      hyphens: auto;
    }
    
    .markdown-body a {
      word-break: break-all;
    }
    
    .markdown-body table {
      display: block;
      width: 100%;
      overflow: auto;
    }
  </style>` : ''
    
    // Add dark theme body background override
    const darkThemeBodyCSS = options.theme.includes('dark') ? `
  <style>
    /* Dark theme body background override */
    body {
      background-color: ${options.theme === 'github-dark' ? '#0d1117' : '#121212'} !important;
      color: ${options.theme === 'github-dark' ? '#e6edf3' : '#e0e0e0'} !important;
    }
    
    html {
      background-color: ${options.theme === 'github-dark' ? '#0d1117' : '#121212'} !important;
    }
  </style>` : ''
    
    // Add additional CSS for better layout and word wrapping
    const layoutCSS = `
  <style>
    /* Enhanced layout and word wrapping */
    * {
      box-sizing: border-box;
    }
    
    html {
      scroll-behavior: smooth;
    }
    
    body {
      margin: 0;
      padding: 0;
      min-height: 100vh;
    }
    
    /* Ensure proper word wrapping for all text elements */
    p, li, td, th, div, span {
      word-wrap: break-word;
      overflow-wrap: break-word;
      hyphens: auto;
    }
    
    /* Handle long URLs and code */
    a {
      word-break: break-all;
    }
    
    /* Responsive images */
    img {
      max-width: 100%;
      height: auto;
    }
    
    /* Better table handling */
    table {
      table-layout: auto;
      width: 100%;
    }
    
    /* KaTeX math expressions responsive handling */
    .katex-display {
      overflow-x: auto;
      overflow-y: hidden;
      max-width: 100%;
      margin: 1em 0;
      text-align: center;
    }
    
    .katex {
      font-size: 1.1em;
      line-height: 1.2;
      white-space: nowrap;
    }
    
    /* Allow line breaks for very long inline math */
    .katex-html {
      overflow-wrap: break-word;
      word-wrap: break-word;
    }
    
    /* Responsive math for mobile */
    @media (max-width: 768px) {
      .katex-display {
        font-size: 0.9em;
        margin: 0.8em 0;
      }
      
      .katex {
        font-size: 1em;
      }
      
      /* Allow horizontal scroll for very wide equations */
      .katex-display > .katex {
        display: inline-block;
        max-width: 100%;
        overflow-x: auto;
        overflow-y: hidden;
      }
    }
    
    /* Print optimizations */
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      .katex-display {
        page-break-inside: avoid;
        break-inside: avoid;
      }
    }
  </style>`
    
    const katexCSS = options.includeCSS ? `
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css" integrity="sha384-5TcZemv2l/9On385z///+d7MSYlvIEw9FuZTIdZ14vJLqWphw7e7ZPuOiCHJcFCP" crossorigin="anonymous">` : ''
     
     const katexJS = options.includeCSS ? `
    <!-- The loading of KaTeX is deferred to speed up page rendering -->
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.js" integrity="sha384-cMkvdD8LoxVzGF/RPUKAcvmm49FQ0oxwDF3BGKtDXcEc+T1b2N+teh/OJfpU0jr6" crossorigin="anonymous"></script>
    
    <!-- To automatically render math in text elements, include the auto-render extension -->
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/contrib/auto-render.min.js" integrity="sha384-hCXGrW6PitJEwbkoStFjeJxv+fSOOQKOPbJxSfM6G5sWZjAyWhXiTIIAmQqnlLlh" crossorigin="anonymous" onload="renderMathInElement(document.body);"></script>` : ''
     
     const highlightCSS = options.includeCSS ? `
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/${options.theme.includes('dark') ? 'github-dark' : 'github'}.min.css">` : ''
     
     const html = `<!DOCTYPE html>
<!-- KaTeX requires the use of the HTML5 doctype. Without it, KaTeX may not render properly -->
<html lang="en">
<head>${metaTags}
  <title>${options.pageTitle}</title>${cssLink}${katexCSS}${katexJS}${highlightCSS}${markdownFeaturesCSS}${githubCompatCSS}${darkThemeBodyCSS}${layoutCSS}
</head>
<body>
  <div class="markdown-preview-content ${options.theme.includes('dark') ? 'dark' : 'light'}">
    ${content}
  </div>
</body>
</html>`
    
    return html
  } else {
    // Return just the HTML content
    return content
  }
}

export const handlePrintToPDF = async (options: ExportOptions, generateHTML: () => Promise<string | undefined>, toast: any) => {
  // Generate complete HTML document
  const tempOptions = {
    ...options,
    exportFormat: 'html-standalone' as const,
    includeCSS: true,
    includeMetaTags: true,
    useContainer: options.useContainer // Preserve container setting for PDF
  }
  
  const originalOptionsRef = options
  Object.assign(options, tempOptions)
  const html = await generateHTML()
  Object.assign(options, originalOptionsRef)
  
  if (!html) return

  // Create enhanced HTML with print styles and scripts
  const printCSS = PRINT_CSS_TEMPLATE(
    options.pdfOptions.margin.toString(),
    options.pdfOptions.format,
    options.pdfOptions.orientation
  )
  
  const htmlWithEnhancements = html.replace(
    '</head>',
    printCSS + SMART_PAGE_BREAK_SCRIPT + '</head>'
  )
  
  const blob = new Blob([htmlWithEnhancements], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  
  createPrintIframe(url, () => URL.revokeObjectURL(url))

  toast({
    title: "Print dialog opened",
    description: "Use 'Save as PDF' in the print dialog for best results",
  })
}