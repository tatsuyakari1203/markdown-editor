import { ExportOptions } from './types'
import { PRINT_CSS_TEMPLATE, SMART_PAGE_BREAK_SCRIPT } from './constants'
import type { WorkerRequest, WorkerResponse } from '../../workers/types'

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

// Process markdown with enhanced features using worker
export const processMarkdownWithFeatures = async (markdown: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Create worker for export processing
    const worker = new Worker(
      new URL('../../workers/markdown.worker.ts', import.meta.url),
      { type: 'module' }
    );
    
    const requestId = `export_${Date.now()}`;
    
    // Handle worker response
    worker.onmessage = async (event: MessageEvent<WorkerResponse>) => {
      const { id, success, payload, error } = event.data;
      
      if (id === requestId) {
        worker.terminate();
        
        if (success) {
          try {
            resolve(payload);
          } catch (mathError) {
            console.warn('Failed to render math in export, using original HTML:', mathError);
            resolve(payload);
          }
        } else {
          reject(new Error(error || 'Export processing failed'));
        }
      }
    };
    
    // Handle worker error
    worker.onerror = (error) => {
      worker.terminate();
      reject(new Error('Worker error during export'));
    };
    
    // Send request
    const request: WorkerRequest = {
      id: requestId,
      type: 'PROCESS_MARKDOWN',
      payload: { markdown }
    };
    
    worker.postMessage(request);
    
    // Timeout after 30 seconds
    setTimeout(() => {
      worker.terminate();
      reject(new Error('Export processing timeout'));
    }, 30000);
  });
}

export const getMarkdownFeaturesCSS = () => {
  // Read the markdown-base.css content directly for export
  return `
/* Markdown Base Styles */
.markdown-content {
  line-height: 1.6;
  color: inherit;
  font-family: inherit;
}

/* Headings */
.markdown-content h1,
.markdown-content h2,
.markdown-content h3,
.markdown-content h4,
.markdown-content h5,
.markdown-content h6 {
  margin: 1.5em 0 0.5em 0;
  font-weight: 600;
  line-height: 1.25;
}

.markdown-content h1 { font-size: 2em; }
.markdown-content h2 { font-size: 1.5em; }
.markdown-content h3 { font-size: 1.25em; }
.markdown-content h4 { font-size: 1.1em; }
.markdown-content h5 { font-size: 1em; }
.markdown-content h6 { font-size: 0.9em; }

/* Paragraphs */
.markdown-content p {
  margin: 1em 0;
}

/* Lists */
.markdown-content ul,
.markdown-content ol {
  margin: 1em 0;
  padding-left: 2em;
}

.markdown-content li {
  margin: 0.25em 0;
}

/* Links */
.markdown-content a {
  color: #0066cc;
  text-decoration: underline;
}

.markdown-content a:hover {
  text-decoration: none;
}

/* Code */
.markdown-content code {
  background: #f5f5f5;
  padding: 0.125em 0.25em;
  border-radius: 3px;
  font-family: monospace;
  font-size: 0.9em;
}

.markdown-content pre {
  background: #f5f5f5;
  padding: 1em;
  border-radius: 5px;
  overflow-x: auto;
  margin: 1em 0;
}

.markdown-content pre code {
  background: transparent;
  padding: 0;
}

/* Tables */
.markdown-content table {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}

.markdown-content th,
.markdown-content td {
  border: 1px solid #ddd;
  padding: 0.5em;
  text-align: left;
}

.markdown-content th {
  background: #f5f5f5;
  font-weight: 600;
}

/* Blockquotes */
.markdown-content blockquote {
  border-left: 4px solid #ddd;
  margin: 1em 0;
  padding: 0 1em;
  color: #666;
}

/* Horizontal Rule */
.markdown-content hr {
  border: none;
  border-top: 1px solid #ddd;
  margin: 2em 0;
}

/* Images */
.markdown-content img {
  max-width: 100%;
  height: auto;
}
  `
}

export const getThemeCSS = () => {
  return `
/* Export Theme CSS */
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: #333;
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.markdown-content {
  box-sizing: border-box;
  min-width: 200px;
  max-width: 980px;
  margin: 0 auto;
  padding: 45px;
}

@media (max-width: 767px) {
  .markdown-content {
    padding: 15px;
  }
}
  `
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
    const preview = document.querySelector('.markdown-content')
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
    // For all themes without custom container, ensure proper styling with markdown-content class
    content = `<div class="markdown-content">${content}</div>`
  }

  if (options.exportFormat === 'html-standalone') {
    // Generate complete HTML document
    const metaTags = options.includeMetaTags ? `
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="Markdown Editor">` : ''
    
    const cssLink = options.includeCSS && options.theme !== 'custom' ? 
      (options.theme.startsWith('github') ? 
        `\n  <link rel="stylesheet" href="${getThemeCSS()}">` :
  `\n  <style>${getThemeCSS()}</style>`) : ''
    
    // Add enhanced markdown features CSS (includes syntax highlighting)
    const markdownFeaturesCSS = options.includeCSS ? 
      `\n  <style>${getMarkdownFeaturesCSS()}</style>` : ''
    
    // Add GitHub theme compatibility CSS
    const githubCompatCSS = options.includeCSS && options.theme.startsWith('github') ? `
  <style>
    /* GitHub theme compatibility */
    .markdown-content {
      box-sizing: border-box;
      min-width: 200px;
      max-width: 980px;
      margin: 0 auto;
      padding: 45px;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    
    @media (max-width: 767px) {
      .markdown-content {
        padding: 15px;
      }
    }
    
    /* Enhanced word wrapping for GitHub themes */
    .markdown-content p, 
    .markdown-content li, 
    .markdown-content td, 
    .markdown-content th {
      word-wrap: break-word;
      overflow-wrap: break-word;
      hyphens: auto;
    }
    
    .markdown-content a {
      word-break: break-all;
    }
    
    .markdown-content table {
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
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.30.0/themes/${options.theme.includes('dark') ? 'prism-dark' : 'prism'}.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.30.0/plugins/line-numbers/prism-line-numbers.min.css">` : ''
     
     const highlightJS = options.includeCSS ? `
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.30.0/prism.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.30.0/plugins/line-numbers/prism-line-numbers.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.30.0/plugins/autoloader/prism-autoloader.min.js"></script>
    <script>
      // Add line-numbers class to all pre elements
      document.querySelectorAll('pre').forEach(pre => {
        if (pre.querySelector('code')) {
          pre.classList.add('line-numbers');
        }
      });
      Prism.highlightAll();
    </script>` : ''
     
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
  ${highlightJS}
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