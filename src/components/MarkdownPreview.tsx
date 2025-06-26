import React, { useMemo, useRef, useEffect } from 'react'
import { marked } from 'marked'
import CodeBlock from './CodeBlock'

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
      // Replace code blocks with syntax highlighted versions
      const codeBlocks = previewRef.current.querySelectorAll('pre code')
      codeBlocks.forEach((codeElement) => {
        const preElement = codeElement.parentElement as HTMLPreElement
        if (!preElement) return

        // Extract language from class name (e.g., "language-javascript")
        const className = codeElement.className || ''
        const languageMatch = className.match(/language-(\w+)/)
        const language = languageMatch ? languageMatch[1] : 'text'
        
        // Get the code content, preserving whitespace and line breaks
        const code = codeElement.textContent || ''
        // Remove any trailing newline that might be added by marked
        const cleanCode = code.replace(/\n$/, '')
        
        let container: HTMLDivElement
        
        // Check if we already have a syntax-highlighted container
        const existingContainer = preElement.nextElementSibling
        if (existingContainer?.classList.contains('syntax-highlighted')) {
          container = existingContainer as HTMLDivElement
          // Unmount existing root if it exists
          const existingRoot = (container as any).__reactRoot
          if (existingRoot) {
            try {
              existingRoot.unmount()
            } catch (error) {
              console.warn('Error unmounting existing React root:', error)
            }
          }
        } else {
          // Create a new container if none exists
          container = document.createElement('div')
          container.className = 'syntax-highlighted'
          preElement.parentNode?.insertBefore(container, preElement.nextSibling)
        }

        // Hide the original pre element but keep it in the DOM
        preElement.style.display = 'none'
        
        // Render CodeBlock component
        import('react-dom/client').then(({ createRoot }) => {
          const root = createRoot(container)
          // Store root reference for cleanup
          ;(container as any).__reactRoot = root
          root.render(
            React.createElement(CodeBlock, {
              code: cleanCode,
              language: language,
              isDarkMode: isDarkMode,
              showLineNumbers: true
            })
          )
        })
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

  // Cleanup effect for React roots - only on component unmount
  useEffect(() => {
    return () => {
      // Cleanup all React roots when component unmounts
      if (previewRef.current) {
        const existingContainers = previewRef.current.querySelectorAll('.syntax-highlighted')
        existingContainers.forEach((container) => {
          const root = (container as any).__reactRoot
          if (root) {
            try {
              root.unmount()
            } catch (error) {
              console.warn('Error unmounting React root:', error)
            }
          }
          // Also remove the container itself
          container.remove()
        })

        // Restore original pre elements
        const hiddenPres = previewRef.current.querySelectorAll('pre[style*="display: none"]')
        hiddenPres.forEach((pre) => {
          ;(pre as HTMLElement).style.display = ''
        })
      }
    }
  }, [])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div 
        ref={previewRef}
        className={`flex-1 p-6 pb-16 overflow-auto markdown-preview-content transition-colors duration-300 ${
          isDarkMode 
            ? 'bg-transparent text-gray-100' 
            : 'bg-transparent text-gray-900'
        }`}
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
