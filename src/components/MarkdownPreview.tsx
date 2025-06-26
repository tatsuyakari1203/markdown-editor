import React, { useMemo, useRef, useEffect } from 'react'
import { marked } from 'marked'

interface MarkdownPreviewProps {
  markdown: string
  isDarkMode: boolean
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ markdown, isDarkMode }) => {
  const previewRef = useRef<HTMLDivElement>(null)

  const htmlContent = useMemo(() => {
    // Configure marked options
    marked.setOptions({
      breaks: true,
      gfm: true,
      pedantic: false
    })

    try {
      return marked.parse(markdown)
    } catch (error) {
      console.error('Markdown parsing error:', error)
      return `<div class="error-message">
        <h3>Parsing Error</h3>
        <p>There was an error parsing the Markdown content. Please check your syntax.</p>
        <details>
          <summary>Error Details</summary>
          <pre>${error}</pre>
        </details>
      </div>`
    }
  }, [markdown])

  // Apply post-processing to the rendered content
  useEffect(() => {
    if (previewRef.current) {
      // Add copy functionality to code blocks
      const codeBlocks = previewRef.current.querySelectorAll('pre')
      codeBlocks.forEach((block) => {
        if (!block.querySelector('.copy-button')) {
          const button = document.createElement('button')
          button.textContent = 'Copy'
          button.className = 'copy-button'
          button.style.cssText = `
            position: absolute;
            top: 8px;
            right: 8px;
            padding: 4px 8px;
            font-size: 12px;
            background: ${isDarkMode ? '#374151' : '#f3f4f6'};
            border: 1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'};
            border-radius: 4px;
            cursor: pointer;
            color: ${isDarkMode ? '#d1d5db' : '#374151'};
          `
          
          button.onclick = () => {
            const code = block.textContent || ''
            navigator.clipboard.writeText(code).then(() => {
              button.textContent = 'Copied!'
              setTimeout(() => {
                button.textContent = 'Copy'
              }, 2000)
            })
          }
          
          block.style.position = 'relative'
          block.appendChild(button)
        }
      })

      // Enhance external links
      const links = previewRef.current.querySelectorAll('a[href^="http"]')
      links.forEach((link) => {
        link.setAttribute('target', '_blank')
        link.setAttribute('rel', 'noopener noreferrer')
        link.classList.add('markdown-link')
      })

      // Enhance tables
      const tables = previewRef.current.querySelectorAll('table')
      tables.forEach((table) => {
        if (!table.parentElement?.classList.contains('table-wrapper')) {
          const wrapper = document.createElement('div')
          wrapper.className = 'table-wrapper'
          table.parentNode?.insertBefore(wrapper, table)
          wrapper.appendChild(table)
        }
        table.classList.add('markdown-table')
      })

      // Enhance blockquotes
      const blockquotes = previewRef.current.querySelectorAll('blockquote')
      blockquotes.forEach((quote) => {
        quote.classList.add('markdown-blockquote')
      })

      // Enhance images
      const images = previewRef.current.querySelectorAll('img')
      images.forEach((img) => {
        img.classList.add('markdown-image')
        img.setAttribute('loading', 'lazy')
      })
    }
  }, [htmlContent, isDarkMode])

  return (
    <div className="h-full flex flex-col">
      <div 
        ref={previewRef}
        className={`flex-1 p-6 overflow-auto markdown-preview-content transition-colors duration-300 ${
          isDarkMode 
            ? 'bg-transparent text-gray-100' 
            : 'bg-transparent text-gray-900'
        }`}
        style={{ minHeight: 'calc(100vh - 16rem)' }}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
      
      {/* Preview Status */}
      <div className={`px-4 py-2 border-t text-xs flex justify-between transition-colors duration-300 ${
        isDarkMode 
          ? 'bg-gray-800/50 border-gray-600 text-gray-400' 
          : 'bg-gray-50/50 border-gray-200 text-gray-500'
      }`}>
        <span>
          Preview rendered
        </span>
        <span>
          {new Date().toLocaleTimeString()}
        </span>
      </div>
    </div>
  )
}

export default MarkdownPreview
