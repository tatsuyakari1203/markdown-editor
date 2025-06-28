import { ExportOptions } from './types'
import { PRINT_CSS_TEMPLATE, SMART_PAGE_BREAK_SCRIPT } from './constants'

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

export const getSyntaxHighlightingCSS = (isDark: boolean) => {
  return `
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

export const generateHTML = (options: ExportOptions, toast: any) => {
  const preview = document.querySelector('.markdown-preview-content')
  if (!preview) {
    toast({
      title: "Export failed",
      description: "Preview content not found",
      variant: "destructive",
    })
    return
  }

  let content = preview.innerHTML
  
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
    
    // Add syntax highlighting CSS
    const syntaxCSS = options.includeCSS ? 
      `\n  <style>${getSyntaxHighlightingCSS(options.theme.includes('dark'))}</style>` : ''
    
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
    
    /* Print optimizations */
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>`
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>${metaTags}
  <title>${options.pageTitle}</title>${cssLink}${syntaxCSS}${githubCompatCSS}${darkThemeBodyCSS}${layoutCSS}
</head>
<body>
  ${content}
</body>
</html>`
    
    return html
  } else {
    // Return just the HTML content
    return content
  }
}

export const handlePrintToPDF = (options: ExportOptions, generateHTML: () => string | undefined, toast: any) => {
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
  const html = generateHTML()
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