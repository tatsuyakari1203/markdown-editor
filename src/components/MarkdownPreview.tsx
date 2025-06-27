import React, { useRef, useMemo, useCallback, useEffect } from 'react'
import { createRoot, Root } from 'react-dom/client'
import { marked } from 'marked'
import CodeBlock from './CodeBlock'

interface MarkdownPreviewProps {
  markdown: string
  isDarkMode: boolean
}

/**
 * Optimized MarkdownPreview Component
 * 
 * Performance improvements:
 * - Separated DOM processing logic into reusable callbacks
 * - Proper React root management with cleanup tracking
 * - Memoized class names and expensive computations
 * - Avoided dynamic imports in render cycle
 * - Added data-enhanced attributes to prevent duplicate processing
 * - Centralized cleanup logic for better memory management
 */

// Store React roots for cleanup
interface ReactRootStore {
  [key: string]: Root
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ markdown, isDarkMode }) => {
  const previewRef = useRef<HTMLDivElement>(null)
  const reactRootsRef = useRef<ReactRootStore>({})

  // Configure marked options once
  const markedOptions = useMemo(() => ({
    breaks: true,
    gfm: true,
    pedantic: false
  }), [])

  const htmlContent = useMemo(() => {
    marked.setOptions(markedOptions)

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
  }, [markdown, markedOptions])

  // Enhanced code block processing with better performance
  const processCodeBlocks = useCallback(() => {
    if (!previewRef.current) return

    const codeBlocks = previewRef.current.querySelectorAll('pre code')
    
    codeBlocks.forEach((codeElement, index) => {
      const preElement = codeElement.parentElement as HTMLPreElement
      if (!preElement) return

      // Extract language from class name
      const className = codeElement.className || ''
      const languageMatch = className.match(/language-(\w+)/)
      const language = languageMatch ? languageMatch[1] : 'text'
      
      // Get clean code content
      const code = codeElement.textContent || ''
      const cleanCode = code.replace(/\n$/, '')
      
      // Create unique container ID for tracking
      const containerId = `syntax-highlighted-${index}`
      let container: HTMLDivElement
      
      // Check for existing container
      const existingContainer = preElement.nextElementSibling as HTMLDivElement
      let root: Root
      let rootId: string
      
      if (existingContainer?.classList.contains('syntax-highlighted')) {
        container = existingContainer
        container.id = containerId
        
        // Reuse existing root if available
        const existingRootId = container.dataset.rootId
        if (existingRootId && reactRootsRef.current[existingRootId]) {
          root = reactRootsRef.current[existingRootId]
          rootId = existingRootId
        } else {
          // Create new root for existing container
          root = createRoot(container)
          rootId = `root-${Date.now()}-${index}`
          container.dataset.rootId = rootId
          reactRootsRef.current[rootId] = root
        }
      } else {
        // Create new container and root
        container = document.createElement('div')
        container.className = 'syntax-highlighted'
        container.id = containerId
        preElement.parentNode?.insertBefore(container, preElement.nextSibling)
        
        root = createRoot(container)
        rootId = `root-${Date.now()}-${index}`
        container.dataset.rootId = rootId
        reactRootsRef.current[rootId] = root
      }

      // Hide original pre element
      preElement.style.display = 'none'
      
      // Render CodeBlock component
      root.render(
        React.createElement(CodeBlock, {
          code: cleanCode,
          language: language,
          isDarkMode: isDarkMode,
          showLineNumbers: true
        })
      )
    })
  }, [isDarkMode])

  // Enhanced DOM processing with better organization
  const enhanceDOMElements = useCallback(() => {
    if (!previewRef.current) return

    
    // Enhance external links
    const links = previewRef.current.querySelectorAll('a[href^="http"]')
    links.forEach((link) => {
      if (!link.hasAttribute('data-enhanced')) {
        link.setAttribute('target', '_blank')
        link.setAttribute('rel', 'noopener noreferrer')
        link.classList.add('markdown-link')
        link.setAttribute('data-enhanced', 'true')
      }
    })

    // Enhance tables
    const tables = previewRef.current.querySelectorAll('table')
    tables.forEach((table) => {
      if (!table.hasAttribute('data-enhanced')) {
        if (!table.parentElement?.classList.contains('table-wrapper')) {
          const wrapper = document.createElement('div')
          wrapper.className = 'table-wrapper'
          table.parentNode?.insertBefore(wrapper, table)
          wrapper.appendChild(table)
        }
        table.classList.add('markdown-table')
        table.setAttribute('data-enhanced', 'true')
      }
    })

    // Enhance blockquotes
    const blockquotes = previewRef.current.querySelectorAll('blockquote')
    blockquotes.forEach((quote) => {
      if (!quote.hasAttribute('data-enhanced')) {
        quote.classList.add('markdown-blockquote')
        quote.setAttribute('data-enhanced', 'true')
      }
    })

    // Enhance images
    const images = previewRef.current.querySelectorAll('img')
    images.forEach((img) => {
      if (!img.hasAttribute('data-enhanced')) {
        img.classList.add('markdown-image')
        img.setAttribute('loading', 'lazy')
        img.setAttribute('data-enhanced', 'true')
      }
    })
  }, [])

  // Main effect for processing DOM content
  useEffect(() => {
    if (previewRef.current) {
      processCodeBlocks()
      enhanceDOMElements()
    }
  }, [htmlContent, processCodeBlocks, enhanceDOMElements])

  // Cleanup all React roots when component unmounts
  useEffect(() => {
    return () => {
      // Clean up all stored React roots asynchronously
      const rootsToUnmount = Object.values(reactRootsRef.current)
      reactRootsRef.current = {}
      
      // Schedule unmounting for next tick to avoid race conditions
      if (rootsToUnmount.length > 0) {
        setTimeout(() => {
          rootsToUnmount.forEach((root) => {
            try {
              root.unmount()
            } catch (error) {
              console.warn('Error unmounting React root during cleanup:', error)
            }
          })
        }, 0)
      }

      // Clean up DOM elements
      if (previewRef.current) {
        // Remove syntax-highlighted containers
        const containers = previewRef.current.querySelectorAll('.syntax-highlighted')
        containers.forEach((container) => container.remove())

        // Restore original pre elements
        const hiddenPres = previewRef.current.querySelectorAll('pre[style*="display: none"]')
        hiddenPres.forEach((pre) => {
          (pre as HTMLElement).style.display = ''
        })
      }
    }
  }, [])

  // Memoize class names for better performance
  const previewClassName = useMemo(() => 
    `flex-1 p-6 pb-16 overflow-auto markdown-preview-content transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-transparent text-gray-100' 
        : 'bg-transparent text-gray-900'
    }`, [isDarkMode]
  )

  const statusClassName = useMemo(() => 
    `px-4 py-2 border-t text-xs flex justify-between transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-gray-800/50 border-gray-600 text-gray-400' 
        : 'bg-gray-50/50 border-gray-200 text-gray-500'
    }`, [isDarkMode]
  )

  // Memoize current time to avoid unnecessary re-renders
  const currentTime = useMemo(() => new Date().toLocaleTimeString(), [htmlContent])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div 
        ref={previewRef}
        className={previewClassName}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
      
      {/* Preview Status */}
      <div className={statusClassName}>
        <span>Preview rendered</span>
        <span>{currentTime}</span>
      </div>
    </div>
  )
}

export default MarkdownPreview
