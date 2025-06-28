import React, { useState } from 'react'
import { Download, Settings, FileText, Palette, Container, FileDown } from 'lucide-react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import { Label } from './ui/label'
import { RadioGroup, RadioGroupItem } from './ui/radio-group'
import { Checkbox } from './ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Separator } from './ui/separator'
import { useToast } from '../hooks/use-toast'

// Constants for print functionality
const PRINT_CSS_TEMPLATE = (margin: string, format: string, orientation: string) => `
  <style>
    @media print {
      body {
        margin: ${margin}mm !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        line-height: 1.6;
        color: #000;
        background: white;
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
        display: block;
        margin: 1em 0;
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
      
      /* Code blocks with smart breaking */
      pre {
        background: #f6f8fa !important;
        border: 1px solid #e1e4e8 !important;
        border-radius: 6px !important;
        padding: 16px !important;
        overflow: visible !important;
        white-space: pre-wrap !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        margin: 1em 0 !important;
        orphans: 3;
        widows: 3;
      }
      
      pre.long-code {
        page-break-inside: auto !important;
        break-inside: auto !important;
      }
      
      code {
        background: #f6f8fa !important;
        padding: 0.2em 0.4em !important;
        border-radius: 3px !important;
        font-size: 85% !important;
      }
      
      /* Syntax highlighting */
      .hljs {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      
      .hljs.long-code {
        page-break-inside: auto !important;
        break-inside: auto !important;
      }
      
      /* Tables */
      table {
        border-collapse: collapse !important;
        width: 100% !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        margin: 1em 0;
      }
      
      th, td {
        border: 1px solid #dfe2e5 !important;
        padding: 6px 13px !important;
        text-align: left !important;
      }
      
      th {
        background: #f6f8fa !important;
        font-weight: 600 !important;
      }
      
      /* Blockquotes */
      blockquote {
        border-left: 4px solid #dfe2e5 !important;
        padding-left: 16px !important;
        margin: 16px 0 !important;
        color: #6a737d !important;
      }
      
      /* Utility classes */
      .page-break-before {
        page-break-before: always !important;
        break-before: page !important;
      }
      
      .page-break-hint {
        display: block;
        height: 0;
        page-break-before: auto !important;
        break-before: auto !important;
        page-break-after: auto !important;
        break-after: auto !important;
      }
      
      .no-print {
        display: none !important;
      }
    }
    
    @page {
      size: ${format} ${orientation};
      margin: ${margin}mm;
    }
  </style>
`

const SMART_PAGE_BREAK_SCRIPT = `
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      // Handle long code blocks
      const codeBlocks = document.querySelectorAll('pre');
      codeBlocks.forEach(function(block) {
        const lines = block.textContent.split('\n').length;
        const height = block.offsetHeight;
        
        if (lines > 20 || height > 400) {
          block.classList.add('long-code');
          
          if (lines > 40) {
            const content = block.innerHTML;
            const lineArray = content.split('\n');
            let newContent = '';
            
            lineArray.forEach(function(line, index) {
              if (index > 0 && index % 25 === 0) {
                newContent += '<span class="page-break-hint"></span>';
              }
              newContent += line + (index < lineArray.length - 1 ? '\n' : '');
            });
            
            block.innerHTML = newContent;
          }
        }
      });
      
      // Handle major section breaks
      const headings = document.querySelectorAll('h1, h2');
      headings.forEach(function(heading, index) {
        if (index > 0) {
          const prevSection = heading.previousElementSibling;
          if (prevSection && prevSection.offsetHeight > 300) {
            heading.classList.add('page-break-before');
          }
        }
      });
    });
  </script>
`

// Utility functions
const createPrintIframe = (url: string, onComplete: () => void) => {
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

const downloadFile = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

interface ExportDialogProps {
  markdown: string
  isDarkMode: boolean
}

interface ExportOptions {
  theme: 'github-light' | 'github-dark' | 'minimal-light' | 'minimal-dark' | 'custom'
  useContainer: boolean
  containerType: 'div' | 'article' | 'main' | 'section'
  containerClass: string
  includeCSS: boolean
  includeMetaTags: boolean
  pageTitle: string
  exportFormat: 'html' | 'html-standalone' | 'pdf'
  pdfOptions: {
    format: 'a4' | 'letter' | 'legal'
    orientation: 'portrait' | 'landscape'
    margin: number
    textMode: 'browser-print' | 'selectable' | 'image'
  }
}

const ExportDialog: React.FC<ExportDialogProps> = ({ markdown, isDarkMode }) => {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ExportOptions>({
    theme: isDarkMode ? 'github-dark' : 'github-light',
    useContainer: true,
    containerType: 'div',
    containerClass: 'markdown-body',
    includeCSS: true,
    includeMetaTags: true,
    pageTitle: 'Markdown Export',
    exportFormat: 'html-standalone',
    pdfOptions: {
      format: 'a4',
      orientation: 'portrait',
      margin: 20,
      textMode: 'browser-print'
    }
  })

  const themeOptions = [
    { value: 'github-light', label: 'GitHub Light', description: 'Classic GitHub styling (light)' },
    { value: 'github-dark', label: 'GitHub Dark', description: 'Classic GitHub styling (dark)' },
    { value: 'minimal-light', label: 'Minimal Light', description: 'Clean, minimal styling (light)' },
    { value: 'minimal-dark', label: 'Minimal Dark', description: 'Clean, minimal styling (dark)' },
    { value: 'custom', label: 'Custom', description: 'No predefined styles' }
  ]

  const containerOptions = [
    { value: 'div', label: '<div>', description: 'Generic container' },
    { value: 'article', label: '<article>', description: 'Semantic article element' },
    { value: 'main', label: '<main>', description: 'Main content element' },
    { value: 'section', label: '<section>', description: 'Section element' }
  ]

  const getSyntaxHighlightingCSS = (isDark: boolean) => {
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

  const getThemeCSS = (theme: string) => {
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

  const generateHTML = () => {
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

  const generatePDF = async () => {
    const preview = document.querySelector('.markdown-preview-content')
    if (!preview) {
      toast({
        title: "Export failed",
        description: "Preview content not found",
        variant: "destructive",
      })
      return
    }

    try {
      const pdf = new jsPDF({
        orientation: options.pdfOptions.orientation,
        unit: 'mm',
        format: options.pdfOptions.format
      })

      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = options.pdfOptions.margin
      
      if (options.pdfOptions.textMode === 'selectable') {
        // Create PDF with selectable text using improved styling
        const contentWidth = pageWidth - (margin * 2)
        let yPosition = margin + 10
        const maxYPosition = pageHeight - margin
        
        // Define styling functions for different elements
        const setHeadingStyle = (level: number) => {
          const sizes = [16, 14, 13, 12, 11, 10]
          pdf.setFont('helvetica', 'bold')
          pdf.setFontSize(sizes[level - 1] || 10)
        }
        
        const setParagraphStyle = () => {
          pdf.setFont('helvetica', 'normal')
          pdf.setFontSize(11)
        }
        
        const setCodeStyle = () => {
          pdf.setFont('courier', 'normal')
          pdf.setFontSize(9)
        }
        
        const setQuoteStyle = () => {
          pdf.setFont('helvetica', 'italic')
          pdf.setFontSize(10)
        }
        
        const setListStyle = () => {
          pdf.setFont('helvetica', 'normal')
          pdf.setFontSize(10)
        }
        
        const setBoldStyle = () => {
          pdf.setFont('helvetica', 'bold')
          pdf.setFontSize(11)
        }
        
        const addNewPageIfNeeded = (requiredHeight: number = 6) => {
          if (yPosition + requiredHeight > maxYPosition) {
            pdf.addPage()
            yPosition = margin + 10
          }
        }
        
        // Clean text content by removing special characters and icons
          const cleanText = (text: string): string => {
            return text
              // Remove emoji and special Unicode characters
              .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
              // Remove common icon patterns
              .replace(/[\u{1F900}-\u{1F9FF}]|[\u{1FA70}-\u{1FAFF}]/gu, '')
              // Remove zero-width characters
              .replace(/[\u200B-\u200D\uFEFF]/g, '')
              // Remove special symbols commonly used as icons
              .replace(/[⚡⭐🔥💡🎯🚀📝✨🎉🔧⚙️📊📈📉💰🎨🎵🎮🏆🌟💎🔮🎪🎭🎨]/g, '')
              // Remove geometric shapes used as bullets
              .replace(/[▪▫▬►◄▲▼◆◇○●◯◉☐☑☒]/g, '')
              // Remove arrows and special punctuation
              .replace(/[→←↑↓↔↕⇒⇐⇑⇓⇔⇕➡⬅⬆⬇]/g, '')
              // Replace common markdown symbols with cleaner alternatives
              .replace(/[✓✔]/g, '✓')
              .replace(/[✗✘]/g, '✗')
              // Remove excessive whitespace
              .replace(/\s+/g, ' ')
              // Remove leading/trailing whitespace
              .trim()
          }
          
          // Format text for better readability
          const formatText = (text: string, type: 'heading' | 'paragraph' | 'list' | 'quote' | 'code' = 'paragraph'): string => {
            const cleaned = cleanText(text)
            if (!cleaned) return ''
            
            switch (type) {
              case 'heading':
                return cleaned.toUpperCase()
              case 'quote':
                return `"${cleaned}"`
              case 'code':
                return cleaned // Keep code as-is after cleaning
              case 'list':
                return cleaned
              default:
                return cleaned
            }
          }
         
         // Process elements with proper styling
         const processElement = (element: Element, indent: number = 0) => {
           const tagName = element.tagName.toLowerCase()
           const indentX = margin + 5 + (indent * 10)
          
          switch (tagName) {
            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
            case 'h5':
            case 'h6':
              const level = parseInt(tagName.charAt(1))
               setHeadingStyle(level)
               addNewPageIfNeeded(12)
               yPosition += level === 1 ? 8 : 6
               const headingText = formatText(element.textContent || '', 'heading')
                const headingLines = pdf.splitTextToSize(headingText, contentWidth - indent * 10)
              headingLines.forEach((line: string) => {
                pdf.text(line, indentX, yPosition)
                yPosition += 6
              })
              yPosition += 4
              break
              
            case 'p':
              setParagraphStyle()
               addNewPageIfNeeded()
               const pText = formatText(element.textContent || '', 'paragraph')
                if (pText) {
                  const pLines = pdf.splitTextToSize(pText, contentWidth - indent * 10)
                pLines.forEach((line: string) => {
                  addNewPageIfNeeded()
                  pdf.text(line, indentX, yPosition)
                  yPosition += 5
                })
                yPosition += 3
              }
              break
              
            case 'ul':
            case 'ol':
              yPosition += 2
              Array.from(element.children).forEach((li, index) => {
                if (li.tagName.toLowerCase() === 'li') {
                  setListStyle()
                  addNewPageIfNeeded()
                  const bullet = tagName === 'ul' ? '• ' : `${index + 1}. `
                   const liText = formatText(li.textContent || '', 'list')
                    const liLines = pdf.splitTextToSize(bullet + liText, contentWidth - indent * 10 - 15)
                  liLines.forEach((line: string, lineIndex: number) => {
                    addNewPageIfNeeded()
                    const x = lineIndex === 0 ? indentX : indentX + 15
                    pdf.text(line, x, yPosition)
                    yPosition += 5
                  })
                }
              })
              yPosition += 3
              break
              
            case 'blockquote':
              setQuoteStyle()
               addNewPageIfNeeded()
               const quoteText = formatText(element.textContent || '', 'quote')
                const quoteLines = pdf.splitTextToSize(quoteText, contentWidth - indent * 10 - 20)
              quoteLines.forEach((line: string) => {
                addNewPageIfNeeded()
                pdf.text(line, indentX + 10, yPosition)
                yPosition += 5
              })
              yPosition += 4
              break
              
            case 'pre':
              // Handle pre elements (code blocks)
              setCodeStyle()
              const preElement = element.querySelector('code') || element
              const codeText = formatText(preElement.textContent || '', 'code')
              
              if (codeText.trim()) {
                const codeLines = codeText.split('\n').filter(line => line.trim() || codeText.includes('\n'))
                const maxLineLength = Math.max(...codeLines.map(line => line.length))
                const codeWidth = Math.min(contentWidth - indent * 10 - 8, maxLineLength * 2.5 + 10)
                const codeHeight = codeLines.length * 4.5 + 8
                
                addNewPageIfNeeded(codeHeight + 4)
                
                // Draw code block background with border
                pdf.setDrawColor(180, 180, 180)
                pdf.setFillColor(245, 245, 245)
                pdf.setLineWidth(0.5)
                pdf.rect(indentX - 3, yPosition - 2, codeWidth, codeHeight, 'FD')
                
                // Add subtle shadow effect
                pdf.setFillColor(230, 230, 230)
                pdf.rect(indentX + codeWidth - 2, yPosition, 2, codeHeight - 2, 'F')
                pdf.rect(indentX - 1, yPosition + codeHeight - 2, codeWidth, 2, 'F')
                
                yPosition += 4
                
                codeLines.forEach((line: string, index: number) => {
                  // Add line numbers for multi-line code blocks
                  if (codeLines.length > 1) {
                    pdf.setFont('courier', 'normal')
                    pdf.setFontSize(8)
                    pdf.setTextColor(120, 120, 120)
                    const lineNum = (index + 1).toString().padStart(2, ' ')
                    pdf.text(lineNum, indentX, yPosition)
                    
                    // Draw separator line
                    pdf.setDrawColor(200, 200, 200)
                    pdf.setLineWidth(0.2)
                    pdf.line(indentX + 12, yPosition - 3, indentX + 12, yPosition + 1)
                  }
                  
                  // Code content
                  pdf.setFont('courier', 'normal')
                  pdf.setFontSize(9)
                  pdf.setTextColor(0, 0, 0)
                  const xOffset = codeLines.length > 1 ? 16 : 3
                  
                  // Handle long lines by wrapping
                  const maxCharsPerLine = Math.floor((codeWidth - xOffset - 6) / 2.2)
                  if (line.length > maxCharsPerLine) {
                    const wrappedLines = []
                    for (let i = 0; i < line.length; i += maxCharsPerLine) {
                      wrappedLines.push(line.substring(i, i + maxCharsPerLine))
                    }
                    wrappedLines.forEach((wrappedLine, wrapIndex) => {
                      pdf.text(wrappedLine, indentX + xOffset, yPosition)
                      if (wrapIndex < wrappedLines.length - 1) {
                        yPosition += 4.5
                        addNewPageIfNeeded()
                      }
                    })
                  } else {
                    pdf.text(line, indentX + xOffset, yPosition)
                  }
                  
                  yPosition += 4.5
                  addNewPageIfNeeded()
                })
                
                yPosition += 6
              }
              break
              
            case 'code':
              // Handle inline code
              if (element.parentElement?.tagName.toLowerCase() !== 'pre') {
                pdf.setFont('courier', 'normal')
                pdf.setFontSize(10)
                pdf.setTextColor(0, 0, 0)
                
                const inlineCodeText = cleanText(element.textContent || '')
                if (inlineCodeText) {
                  // Add background for inline code
                  const textWidth = pdf.getTextWidth(inlineCodeText)
                  pdf.setFillColor(240, 240, 240)
                  pdf.rect(indentX - 1, yPosition - 3, textWidth + 2, 5, 'F')
                  
                  pdf.text(inlineCodeText, indentX, yPosition)
                  yPosition += 5
                }
              }
              break
              
            case 'table':
              setBoldStyle()
              addNewPageIfNeeded()
              yPosition += 3
              const rows = Array.from(element.querySelectorAll('tr'))
              rows.forEach((row, rowIndex) => {
                const cells = Array.from(row.children)
                const cellWidth = (contentWidth - indent * 10) / cells.length
                let maxCellHeight = 0
                
                // Calculate row height
                 cells.forEach((cell) => {
                   const cellText = cleanText(cell.textContent || '')
                   const cellLines = pdf.splitTextToSize(cellText, cellWidth - 4)
                   maxCellHeight = Math.max(maxCellHeight, cellLines.length * 5 + 4)
                 })
                
                addNewPageIfNeeded(maxCellHeight)
                
                // Draw table borders
                pdf.setDrawColor(0, 0, 0)
                pdf.setLineWidth(0.1)
                
                cells.forEach((cell, cellIndex) => {
                  const cellX = indentX + (cellIndex * cellWidth)
                  pdf.rect(cellX, yPosition - 2, cellWidth, maxCellHeight)
                  
                  // Set style for header vs data
                  if (rowIndex === 0) {
                    setBoldStyle()
                  } else {
                    setParagraphStyle()
                  }
                  
                  const cellText = cleanText(cell.textContent || '')
                   const cellLines = pdf.splitTextToSize(cellText, cellWidth - 4)
                  cellLines.forEach((line: string, lineIndex: number) => {
                    pdf.text(line, cellX + 2, yPosition + 3 + (lineIndex * 5))
                  })
                })
                
                yPosition += maxCellHeight
              })
              yPosition += 4
              break
              
            case 'strong':
            case 'b':
              setBoldStyle()
               const strongText = cleanText(element.textContent || '')
               if (strongText) {
                 pdf.text(strongText, indentX, yPosition)
                 yPosition += 5
               }
              break
              
            case 'em':
            case 'i':
              pdf.setFont('helvetica', 'italic')
               pdf.setFontSize(11)
               const emText = cleanText(element.textContent || '')
               if (emText) {
                 pdf.text(emText, indentX, yPosition)
                 yPosition += 5
               }
              break
              
            default:
              // Process child elements
              if (element.children.length > 0) {
                Array.from(element.children).forEach(child => {
                  processElement(child, indent)
                })
              } else {
                // Handle text nodes
                 const textContent = cleanText(element.textContent || '')
                 if (textContent && !['script', 'style'].includes(tagName)) {
                   setParagraphStyle()
                   addNewPageIfNeeded()
                   const textLines = pdf.splitTextToSize(textContent, contentWidth - indent * 10)
                  textLines.forEach((line: string) => {
                    addNewPageIfNeeded()
                    pdf.text(line, indentX, yPosition)
                    yPosition += 5
                  })
                }
              }
          }
        }
        
        // Process all elements in the preview
        Array.from(preview.children).forEach(child => {
          processElement(child)
        })
        
        console.log('PDF generated with selectable text and improved styling')
      } else {
        // Create PDF as image
        const canvas = await html2canvas(preview as HTMLElement, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: options.theme.includes('dark') ? '#0d1117' : '#ffffff'
        })
        
        const canvasWidth = canvas.width
        const canvasHeight = canvas.height
        
        const ratio = Math.min(
          (pageWidth - margin * 2) / (canvasWidth * 0.264583),
          (pageHeight - margin * 2) / (canvasHeight * 0.264583)
        )
        
        const scaledWidth = canvasWidth * 0.264583 * ratio
        const scaledHeight = canvasHeight * 0.264583 * ratio

        const imgData = canvas.toDataURL('image/png')
        const x = (pageWidth - scaledWidth) / 2
        const y = margin
        
        pdf.addImage(imgData, 'PNG', x, y, scaledWidth, scaledHeight)
      }
      
      return pdf
    } catch (error) {
      console.error('PDF generation failed:', error)
      
      // Only fallback to image-based PDF if we were trying selectable text mode
      if (options.pdfOptions.textMode === 'selectable') {
        try {
          const canvas = await html2canvas(preview as HTMLElement, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: options.theme.includes('dark') ? '#0d1117' : '#ffffff'
          })

          const pdf = new jsPDF({
            orientation: options.pdfOptions.orientation,
            unit: 'mm',
            format: options.pdfOptions.format
          })

          const pageWidth = pdf.internal.pageSize.getWidth()
          const pageHeight = pdf.internal.pageSize.getHeight()
          const margin = options.pdfOptions.margin
          
          const canvasWidth = canvas.width
          const canvasHeight = canvas.height
          
          const ratio = Math.min(
            (pageWidth - margin * 2) / (canvasWidth * 0.264583),
            (pageHeight - margin * 2) / (canvasHeight * 0.264583)
          )
          
          const scaledWidth = canvasWidth * 0.264583 * ratio
          const scaledHeight = canvasHeight * 0.264583 * ratio

          const imgData = canvas.toDataURL('image/png')
          const x = (pageWidth - scaledWidth) / 2
          const y = margin
          
          pdf.addImage(imgData, 'PNG', x, y, scaledWidth, scaledHeight)
          
          toast({
            title: "PDF exported as image",
            description: "Text-based PDF failed, exported as image instead",
            variant: "default",
          })
          
          return pdf
        } catch (fallbackError) {
          console.error('Fallback PDF generation also failed:', fallbackError)
          toast({
            title: "PDF export failed",
            description: "Unable to generate PDF",
            variant: "destructive",
          })
          return null
        }
      } else {
        // If image mode also failed, show error
        toast({
          title: "PDF export failed",
          description: "Unable to generate PDF",
          variant: "destructive",
        })
        return null
      }
    }
  }



  const handlePrintToPDF = () => {
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
      options.pdfOptions.margin,
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

  const getFileName = (extension: string) => 
    `${options.pageTitle.toLowerCase().replace(/\s+/g, '-')}.${extension}`

  const handleExport = async () => {
    if (options.exportFormat === 'pdf') {
      if (options.pdfOptions.textMode === 'browser-print') {
        handlePrintToPDF()
        setIsOpen(false)
        return
      }
      
      const pdf = await generatePDF()
      if (!pdf) return
      
      pdf.save(getFileName('pdf'))
      toast({
        title: "PDF exported",
        description: `File exported with ${options.theme} theme`,
      })
    } else {
      const html = generateHTML()
      if (!html) return

      downloadFile(html, getFileName('html'), 'text/html')
      toast({
        title: "HTML exported",
        description: `File exported with ${options.theme} theme`,
      })
    }
    
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8">
          <FileDown className="w-3 h-3 mr-1" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className={`max-w-2xl max-h-[90vh] overflow-y-auto ${
        isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            <Settings className="w-5 h-5" />
            Export Options
          </DialogTitle>
          <DialogDescription className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
            Export your markdown as HTML or PDF with customizable options.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Theme Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              <Label className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Theme</Label>
            </div>
            <RadioGroup
              value={options.theme}
              onValueChange={(value) => setOptions(prev => ({ ...prev, theme: value as any }))}
              className="space-y-2"
            >
              {themeOptions.map((theme) => (
                <div key={theme.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={theme.value} id={theme.value} />
                  <div className="flex-1">
                    <Label htmlFor={theme.value} className={`text-sm font-medium cursor-pointer ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {theme.label}
                    </Label>
                    <p className={`text-xs ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {theme.description}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Separator className={isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} />

          {/* Container Options */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Container className="w-4 h-4" />
              <Label className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Container</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="useContainer"
                checked={options.useContainer}
                onCheckedChange={(checked) => setOptions(prev => ({ ...prev, useContainer: !!checked }))}
              />
              <Label htmlFor="useContainer" className={`text-sm cursor-pointer ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Wrap content in container element
              </Label>
            </div>

            {options.useContainer && (
              <div className="space-y-3 ml-6">
                <div>
                  <Label className={`text-sm ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>Container Type</Label>
                  <Select
                    value={options.containerType}
                    onValueChange={(value) => setOptions(prev => ({ ...prev, containerType: value as any }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {containerOptions.map((container) => (
                        <SelectItem key={container.value} value={container.value}>
                          <div>
                            <div className="font-medium">{container.label}</div>
                            <div className="text-xs text-gray-500">{container.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="containerClass" className={`text-sm ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>CSS Class (optional)</Label>
                  <input
                    id="containerClass"
                    type="text"
                    value={options.containerClass}
                    onChange={(e) => setOptions(prev => ({ ...prev, containerClass: e.target.value }))}
                    placeholder="e.g., markdown-body, content"
                    className={`mt-1 w-full px-3 py-2 border rounded-md text-sm ${
                      isDarkMode 
                        ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>
              </div>
            )}
          </div>

          <Separator className={isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} />

          {/* Export Format */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <Label className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Export Format</Label>
            </div>
            <RadioGroup
              value={options.exportFormat}
              onValueChange={(value) => setOptions(prev => ({ ...prev, exportFormat: value as any }))}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="html-standalone" id="html-standalone" />
                <div className="flex-1">
                  <Label htmlFor="html-standalone" className={`text-sm font-medium cursor-pointer ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Complete HTML Document
                  </Label>
                  <p className={`text-xs ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Full HTML page with DOCTYPE, head, and body tags
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="html" id="html" />
                <div className="flex-1">
                  <Label htmlFor="html" className={`text-sm font-medium cursor-pointer ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    HTML Fragment
                  </Label>
                  <p className={`text-xs ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Just the HTML content without document structure
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <div className="flex-1">
                  <Label htmlFor="pdf" className={`text-sm font-medium cursor-pointer ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    PDF Document
                  </Label>
                  <p className={`text-xs ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Export as PDF with customizable format and layout
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* PDF Options */}
          {options.exportFormat === 'pdf' && (
            <>
              <Separator className={isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} />
              
              <div className="space-y-3">
                <Label className={`text-sm font-medium ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>PDF Options</Label>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className={`text-sm ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Page Format</Label>
                    <Select
                      value={options.pdfOptions.format}
                      onValueChange={(value) => setOptions(prev => ({ 
                        ...prev, 
                        pdfOptions: { ...prev.pdfOptions, format: value as any }
                      }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="a4">A4 (210 × 297 mm)</SelectItem>
                        <SelectItem value="letter">Letter (8.5 × 11 in)</SelectItem>
                        <SelectItem value="legal">Legal (8.5 × 14 in)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className={`text-sm ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Orientation</Label>
                    <Select
                      value={options.pdfOptions.orientation}
                      onValueChange={(value) => setOptions(prev => ({ 
                        ...prev, 
                        pdfOptions: { ...prev.pdfOptions, orientation: value as any }
                      }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portrait">Portrait</SelectItem>
                        <SelectItem value="landscape">Landscape</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label className={`text-sm ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>Margin (mm)</Label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={options.pdfOptions.margin}
                    onChange={(e) => setOptions(prev => ({ 
                      ...prev, 
                      pdfOptions: { ...prev.pdfOptions, margin: parseInt(e.target.value) || 20 }
                    }))}
                    className={`mt-1 w-full px-3 py-2 border rounded-md text-sm ${
                      isDarkMode 
                        ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>
                
                <div>
                  <Label className={`text-sm ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>Text Mode</Label>
                  <Select
                    value={options.pdfOptions.textMode}
                    onValueChange={(value) => setOptions(prev => ({ 
                      ...prev, 
                      pdfOptions: { ...prev.pdfOptions, textMode: value as any }
                    }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="browser-print">Browser Print (Best Quality)</SelectItem>
                      <SelectItem value="selectable">Selectable Text (jsPDF)</SelectItem>
                      <SelectItem value="image">Image-based (jsPDF)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className={`text-xs mt-1 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {options.pdfOptions.textMode === 'browser-print'
                      ? 'Uses browser print dialog - best quality and formatting (recommended)'
                      : options.pdfOptions.textMode === 'selectable' 
                      ? 'Text can be selected and copied, but formatting may vary'
                      : 'Preserves exact formatting but text cannot be selected'
                    }
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Additional Options */}
          {options.exportFormat === 'html-standalone' && (
            <>
              <Separator className={isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} />
              
              <div className="space-y-3">
                <Label className={`text-sm font-medium ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>Additional Options</Label>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeCSS"
                      checked={options.includeCSS}
                      onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeCSS: !!checked }))}
                    />
                    <Label htmlFor="includeCSS" className={`text-sm cursor-pointer ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Include CSS styling
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeMetaTags"
                      checked={options.includeMetaTags}
                      onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeMetaTags: !!checked }))}
                    />
                    <Label htmlFor="includeMetaTags" className={`text-sm cursor-pointer ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Include meta tags (charset, viewport)
                    </Label>
                  </div>

                  <div>
                    <Label htmlFor="pageTitle" className={`text-sm ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Page Title</Label>
                    <input
                      id="pageTitle"
                      type="text"
                      value={options.pageTitle}
                      onChange={(e) => setOptions(prev => ({ ...prev, pageTitle: e.target.value }))}
                      placeholder="Document title"
                      className={`mt-1 w-full px-3 py-2 border rounded-md text-sm ${
                        isDarkMode 
                          ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            className={isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : ''}
          >
            Cancel
          </Button>
          <Button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Download className="w-4 h-4 mr-2" />
            Export {options.exportFormat === 'pdf' ? 'PDF' : 'HTML'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ExportDialog