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
    /* Code Block Styles */
    .code-block-wrapper {
      margin: 1rem 0;
      border-radius: 6px;
      border: 1px solid ${isDark ? '#374151' : '#e5e7eb'};
      overflow: hidden;
    }
    
    .code-block-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 500;
      background: ${isDark ? '#1f2937' : '#f9fafb'};
      border-bottom: 1px solid ${isDark ? '#374151' : '#e5e7eb'};
      color: ${isDark ? '#d1d5db' : '#6b7280'};
    }
    
    .code-block-copy {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 4px;
      transition: background-color 0.2s;
      background: transparent;
      border: none;
      cursor: pointer;
      color: ${isDark ? '#9ca3af' : '#6b7280'};
    }
    
    .code-block-copy:hover {
      background: ${isDark ? '#374151' : '#e5e7eb'};
      color: ${isDark ? '#f3f4f6' : '#374151'};
    }
    
    .code-block-content {
      background: ${isDark ? '#1f2937' : '#f9fafb'};
    }
    
    /* Syntax Highlighting Styles */
    .syntax-highlighted pre {
      margin: 0 !important;
      border-radius: 0 0 6px 6px !important;
      font-size: 14px !important;
      line-height: 1.5 !important;
      padding: 16px !important;
      background: ${isDark ? '#1f2937' : '#f9fafb'} !important;
      overflow-x: auto;
    }
    
    .syntax-highlighted .linenumber {
      min-width: 3em;
      padding-right: 1em;
      color: ${isDark ? '#6b7280' : '#9ca3af'} !important;
      border-right: 1px solid ${isDark ? '#374151' : '#e5e7eb'};
      margin-right: 1em;
      text-align: right;
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
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 2rem; }
        h1, h2, h3, h4, h5, h6 { margin-top: 2rem; margin-bottom: 1rem; font-weight: 600; }
        p { margin-bottom: 1rem; }
        code { background: #f6f8fa; padding: 0.2em 0.4em; border-radius: 3px; font-size: 85%; }
        pre { background: #f6f8fa; padding: 1rem; border-radius: 6px; overflow-x: auto; }
        blockquote { border-left: 4px solid #dfe2e5; padding-left: 1rem; margin: 1rem 0; color: #6a737d; }
        table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
        th, td { border: 1px solid #dfe2e5; padding: 0.5rem 1rem; text-align: left; }
        th { background: #f6f8fa; font-weight: 600; }
        `
    case 'minimal-dark':
      return `
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #e6edf3; background: #0d1117; max-width: 800px; margin: 0 auto; padding: 2rem; }
        h1, h2, h3, h4, h5, h6 { margin-top: 2rem; margin-bottom: 1rem; font-weight: 600; color: #f0f6fc; }
        p { margin-bottom: 1rem; }
        code { background: #21262d; padding: 0.2em 0.4em; border-radius: 3px; font-size: 85%; color: #f0f6fc; }
        pre { background: #21262d; padding: 1rem; border-radius: 6px; overflow-x: auto; }
        blockquote { border-left: 4px solid #30363d; padding-left: 1rem; margin: 1rem 0; color: #8b949e; }
        table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
        th, td { border: 1px solid #30363d; padding: 0.5rem 1rem; text-align: left; }
        th { background: #21262d; font-weight: 600; }
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
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>${metaTags}
  <title>${options.pageTitle}</title>${cssLink}${syntaxCSS}
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
    useContainer: false
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