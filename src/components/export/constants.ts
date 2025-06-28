import { ThemeOption, ContainerOption } from './types'

// Print CSS template
export const PRINT_CSS_TEMPLATE = (margin: string, format: string, orientation: string) => `
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

// Smart page break script
export const SMART_PAGE_BREAK_SCRIPT = `
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

// Theme and container options
export const THEME_OPTIONS: ThemeOption[] = [
  { value: 'github-light', label: 'GitHub Light', description: 'Classic GitHub styling (light)' },
  { value: 'github-dark', label: 'GitHub Dark', description: 'Classic GitHub styling (dark)' },
  { value: 'minimal-light', label: 'Minimal Light', description: 'Clean, minimal styling (light)' },
  { value: 'minimal-dark', label: 'Minimal Dark', description: 'Clean, minimal styling (dark)' },
  { value: 'custom', label: 'Custom', description: 'No predefined styles' }
]

export const CONTAINER_OPTIONS: ContainerOption[] = [
  { value: 'div', label: '<div>', description: 'Generic container' },
  { value: 'article', label: '<article>', description: 'Semantic article element' },
  { value: 'main', label: '<main>', description: 'Main content element' },
  { value: 'section', label: '<section>', description: 'Section element' }
]