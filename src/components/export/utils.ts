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

export const getThemeCSS = (theme: string, useContainer: boolean = true) => {
  const isDark = theme.includes('dark')
  const isGithub = theme.startsWith('github')
  
  // Background colors for different scenarios
  const bodyBg = isDark ? (isGithub ? '#010409' : '#0a0a0a') : '#f6f8fa'
  const containerBg = isDark ? (isGithub ? '#0d1117' : '#1a1a1a') : '#ffffff'
  
  return `
/* Export Theme CSS */
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: ${isDark ? '#e6edf3' : '#333'};
  background-color: ${useContainer ? bodyBg : containerBg};
  margin: 0;
  padding: 0;
  min-height: 100vh;
}

.export-wrapper {
  ${useContainer ? 'padding: 2rem; min-height: 100vh; display: flex; justify-content: center; align-items: center;' : ''}
}

.markdown-content {
  box-sizing: border-box;
  min-width: 200px;
  max-width: ${useContainer ? '980px' : 'none'};
  width: ${useContainer ? 'auto' : '100%'};
  margin: ${useContainer ? '0 auto' : '0'};
  padding: ${useContainer ? '45px' : '0'};
  background-color: ${useContainer ? containerBg : 'transparent'};
  ${useContainer && !isDark ? 'box-shadow: 0 4px 12px rgba(0,0,0,0.15);' : ''}
  ${useContainer ? 'border-radius: 12px;' : ''}
  ${useContainer && isDark ? 'border: 1px solid ' + (isGithub ? '#21262d' : '#333333') + ';' : ''}
}

/* Code block theme adaptation */
.markdown-content pre {
  background: ${isDark ? '#161b22' : '#f6f8fa'} !important;
  border: 1px solid ${isDark ? '#30363d' : '#d1d9e0'};
  border-radius: 6px;
}

.markdown-content code {
  background: ${isDark ? '#161b22' : '#f6f8fa'} !important;
  color: ${isDark ? '#e6edf3' : '#24292f'} !important;
  border: 1px solid ${isDark ? '#30363d' : '#d1d9e0'};
}

.markdown-content pre code {
  background: transparent !important;
  border: none;
}

@media (max-width: 767px) {
  .export-wrapper {
    ${useContainer ? 'padding: 1rem !important;' : ''}
  }
  
  .markdown-content {
    padding: ${useContainer ? '15px' : '0'};
    ${useContainer ? 'box-shadow: none; border-radius: 0; max-width: none; width: 100%;' : ''}
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
  
  // Handle content wrapping based on export format
  if (options.exportFormat === 'html') {
    // HTML Fragment: Just return raw content without any wrapper
    // No theme styling or container needed for fragments
    return content
  } else {
    // Complete HTML and PDF: Always wrap in proper container with styling
    if (options.useContainer && options.containerClass) {
      const containerClass = ` class="${options.containerClass}"`
      content = `<${options.containerType}${containerClass}>${content}</${options.containerType}>`
    } else {
      // Default wrapper with markdown-content class for proper styling
      content = `<div class="markdown-content">${content}</div>`
    }
  }

  if (options.exportFormat === 'html-standalone') {
    // Generate complete HTML document
    const metaTags = options.includeMetaTags ? `
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="Markdown Editor">` : ''
    
    const themeCSS = options.includeCSS && options.theme !== 'custom' ? 
      `\n  <style>${getThemeCSS(options.theme, options.useContainer)}</style>` : ''
    
    // Add enhanced markdown features CSS (includes syntax highlighting)
    const markdownFeaturesCSS = options.includeCSS ? 
      `\n  <style>${getMarkdownFeaturesCSS()}</style>` : ''
    
    // Enhanced word wrapping and responsive styles
    const responsiveCSS = options.includeCSS ? `
  <style>
    /* Enhanced word wrapping and responsive design */
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
    <style>
      /* Flat Minimal Code Block Design */
      .code-block-wrapper {
        position: relative;
        margin: 1.5rem 0;
        border-radius: 6px;
        overflow: hidden;
        border: none;
        background: transparent;
      }
      .dark .code-block-wrapper {
        background: transparent;
      }
      .hljs-pre {
        margin: 0;
        padding: 1rem 1rem 1.5rem 1rem;
        overflow-x: auto;
        background: transparent;
        font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
        font-size: 13px;
        line-height: 1.6;
        position: relative;
        color: #24292f;
      }
      .dark .hljs-pre {
        background: transparent;
        color: #e6edf3;
      }
      .hljs-pre.with-line-numbers {
        padding-left: 3rem;
      }
      .line-numbers-wrapper {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 2.5rem;
        padding: 1rem 0.5rem 1rem 0;
        border-right: none;
        background: transparent;
        display: flex;
        flex-direction: column;
        font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
        font-size: 13px;
        line-height: 1.6;
        color: rgba(0, 0, 0, 0.4);
        user-select: none;
      }
      .dark .line-numbers-wrapper {
        background: transparent;
        color: rgba(255, 255, 255, 0.4);
      }
      .line-number {
        text-align: right;
        line-height: 1.6;
        display: block;
      }
      .copy-button {
        position: absolute;
        top: 0.75rem;
        right: 0.75rem;
        padding: 0.375rem 0.75rem;
        background: rgba(0, 0, 0, 0.6);
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 400;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.2s ease;
        z-index: 10;
      }
      .code-block-wrapper:hover .copy-button {
        opacity: 0.8;
      }
      .copy-button:hover {
        opacity: 1;
      }
      .dark .copy-button {
        background: rgba(255, 255, 255, 0.1);
        color: #e6edf3;
      }
      .dark .copy-button:hover {
        background: rgba(255, 255, 255, 0.15);
      }
      
      /* Clean Highlight.js Integration */
      .hljs {
        background: transparent !important;
        padding: 0 !important;
        display: block;
        overflow-x: auto;
      }
      
      /* Minimal Light Theme */
      .light .hljs {
        color: #24292f;
      }
      .light .hljs-comment,
      .light .hljs-quote {
        color: rgba(0, 0, 0, 0.5);
        font-style: italic;
      }
      .light .hljs-keyword,
      .light .hljs-selector-tag,
      .light .hljs-subst {
        color: #cf222e;
        font-weight: 500;
      }
      .light .hljs-number,
      .light .hljs-literal,
      .light .hljs-variable,
      .light .hljs-template-variable,
      .light .hljs-tag .hljs-attr {
        color: #0969da;
      }
      .light .hljs-string,
      .light .hljs-doctag {
        color: #0a3069;
      }
      .light .hljs-title,
      .light .hljs-section,
      .light .hljs-selector-id {
        color: #8250df;
        font-weight: 500;
      }
      
      /* Minimal Dark Theme */
      .dark .hljs {
        color: #e6edf3;
      }
      .dark .hljs-comment,
      .dark .hljs-quote {
        color: rgba(255, 255, 255, 0.5);
        font-style: italic;
      }
      .dark .hljs-keyword,
      .dark .hljs-selector-tag,
      .dark .hljs-subst {
        color: #ff7b72;
        font-weight: 500;
      }
      .dark .hljs-number,
      .dark .hljs-literal,
      .dark .hljs-variable,
      .dark .hljs-template-variable,
      .dark .hljs-tag .hljs-attr {
        color: #79c0ff;
      }
      .dark .hljs-string,
      .dark .hljs-doctag {
        color: #a5d6ff;
      }
      .dark .hljs-title,
      .dark .hljs-section,
      .dark .hljs-selector-id {
        color: #d2a8ff;
        font-weight: 500;
      }
    </style>` : ''
     
     const highlightJS = options.includeCSS ? `
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/javascript.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/typescript.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/python.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/java.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/cpp.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/csharp.min.js"></script>
    <script>
      // Initialize highlight.js and add custom features
      document.addEventListener('DOMContentLoaded', function() {
        // Process all code blocks
        document.querySelectorAll('pre[class*="language-"]').forEach(pre => {
          const codeElement = pre.querySelector('code');
          if (codeElement) {
            const langClass = Array.from(pre.classList).find(cls => cls.startsWith('language-'));
            if (langClass) {
              const language = langClass.replace('language-', '');
              const codeText = codeElement.textContent || '';
              
              // Apply highlight.js
              if (hljs.getLanguage(language)) {
                try {
                  const result = hljs.highlight(codeText, { language });
                  codeElement.innerHTML = result.value;
                  codeElement.className = \`hljs language-\${language}\`;
                } catch (error) {
                  const result = hljs.highlightAuto(codeText);
                  codeElement.innerHTML = result.value;
                  codeElement.className = \`hljs language-\${result.language || 'text'}\`;
                }
              }
              
              // Add wrapper
              if (!pre.parentElement?.classList.contains('code-block-wrapper')) {
                const wrapper = document.createElement('div');
                wrapper.className = 'code-block-wrapper';
                pre.parentNode?.insertBefore(wrapper, pre);
                wrapper.appendChild(pre);
              }
              
              // Add line numbers
              const lines = codeText.split('\\n');
              const lineNumbersHtml = lines.map((_, index) => 
                \`<span class="line-number">\${index + 1}</span>\`
              ).join('');
              
              pre.classList.add('hljs-pre', 'with-line-numbers');
              pre.style.position = 'relative';
              
              const lineNumbersWrapper = document.createElement('div');
              lineNumbersWrapper.className = 'line-numbers-wrapper';
              lineNumbersWrapper.innerHTML = lineNumbersHtml;
              pre.insertBefore(lineNumbersWrapper, pre.firstChild);
              
              // Add copy button
              const copyButton = document.createElement('button');
              copyButton.className = 'copy-button';
              copyButton.textContent = 'Copy';
              copyButton.onclick = async () => {
                try {
                  await navigator.clipboard.writeText(codeText);
                  copyButton.textContent = 'Copied!';
                  setTimeout(() => {
                    copyButton.textContent = 'Copy';
                  }, 2000);
                } catch (error) {
                  copyButton.textContent = 'Failed';
                  setTimeout(() => {
                    copyButton.textContent = 'Copy';
                  }, 2000);
                }
              };
              
              pre.appendChild(copyButton);
            }
          }
        });
      });
    </script>` : ''
     
     const html = `<!DOCTYPE html>
<!-- KaTeX requires the use of the HTML5 doctype. Without it, KaTeX may not render properly -->
<html lang="en">
<head>${metaTags}
  <title>${options.pageTitle}</title>${themeCSS}${katexCSS}${highlightCSS}${markdownFeaturesCSS}${responsiveCSS}${layoutCSS}
</head>
<body>
  <div class="export-wrapper ${options.theme.includes('dark') ? 'dark' : 'light'}">
    ${content}
  </div>
  ${katexJS}${highlightJS}
</body>
</html>`
    
    return html
  } else {
    // Return just the HTML content
    return content
  }
}

export const handlePrintToPDF = async (options: ExportOptions, generateHTML: () => Promise<string | undefined>, toast: any) => {
  // Generate complete HTML document using Complete HTML settings
  const tempOptions = {
    ...options,
    exportFormat: 'html-standalone' as const,
    includeCSS: true,
    includeMetaTags: true,
    useContainer: options.useContainer // Use the same container setting as Complete HTML
  }
  
  const originalOptionsRef = options
  Object.assign(options, tempOptions)
  const html = await generateHTML()
  Object.assign(options, originalOptionsRef)
  
  if (!html) return

  // Create enhanced HTML with basic print styles only
  const basicPrintCSS = `
  <style>
    @media print {
      body {
        margin: 0 !important;
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      
      /* Smart page breaks for headings */
      h1, h2, h3, h4, h5, h6 {
        page-break-after: avoid !important;
        break-after: avoid !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        orphans: 3;
        widows: 3;
      }
      
      /* Avoid breaking block elements */
      blockquote, figure, table, ul, ol {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      
      /* Images and media */
      img {
        max-width: 100% !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      
      /* List items and paragraphs */
      li {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      
      p {
        orphans: 3;
        widows: 3;
      }
    }
  </style>`
  
  const htmlWithEnhancements = html.replace(
    '</head>',
    basicPrintCSS + SMART_PAGE_BREAK_SCRIPT + '</head>'
  )
  
  const blob = new Blob([htmlWithEnhancements], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  
  createPrintIframe(url, () => URL.revokeObjectURL(url))

  toast({
    title: "Print dialog opened",
    description: "Use 'Save as PDF' in the print dialog for best results",
  })
}