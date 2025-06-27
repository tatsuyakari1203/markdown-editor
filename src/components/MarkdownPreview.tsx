import React, { useMemo, useRef, useEffect, useState } from 'react'
import { marked, Renderer } from 'marked'
import { createRoot, Root } from 'react-dom/client'
import CodeBlock from './CodeBlock'

interface MarkdownPreviewProps {
  markdown: string
  isDarkMode: boolean
}

// Store active React roots for CodeBlocks
const codeBlockRoots = new Map<string, Root>()

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ markdown, isDarkMode }) => {
  const previewRef = useRef<HTMLDivElement>(null)
  const [renderedHtmlId, setRenderedHtmlId] = useState(0) // Used to trigger CodeBlock rendering

  const htmlContent = useMemo(() => {
    const renderer = new Renderer()
    let codeBlockCounter = 0

    // Custom renderer for code blocks
    renderer.code = (code, language) => {
      const lang = language || 'text'
      // Remove any trailing newline that might be added by marked
      const cleanCode = code.replace(/\n$/, '')
      const id = `codeblock-${renderedHtmlId}-${codeBlockCounter++}`
      // Output a placeholder div that CodeBlock will be rendered into
      // Store necessary data as data attributes
      return `<div class="codeblock-placeholder" id="${id}" data-code="${encodeURIComponent(cleanCode)}" data-language="${lang}"></div>`
    }

    // Custom renderer for links
    renderer.link = (href, title, text) => {
      const titleAttr = title ? ` title="${title}"` : ''
      if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
        return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer" class="markdown-link">${text}</a>`
      }
      return `<a href="${href}"${titleAttr}>${text}</a>`
    }

    // Custom renderer for tables
    renderer.table = (header, body) => {
      return `
        <div class="table-wrapper">
          <table class="markdown-table">
            <thead>${header}</thead>
            <tbody>${body}</tbody>
          </table>
        </div>
      `
    }

    // Custom renderer for blockquotes
    renderer.blockquote = (quote) => {
      return `<blockquote class="markdown-blockquote">${quote}</blockquote>`
    }

    // Custom renderer for images
    renderer.image = (href, title, text) => {
      const titleAttr = title ? ` title="${title}"` : ''
      const altAttr = text ? ` alt="${text}"` : ''
      return `<img src="${href}"${altAttr}${titleAttr} class="markdown-image" loading="lazy" />`
    }

    marked.setOptions({
      breaks: true,
      gfm: true,
      pedantic: false,
      renderer
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
          <pre>${error instanceof Error ? error.message : String(error)}</pre>
        </details>
      </div>`
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markdown, renderedHtmlId]) // renderedHtmlId is included to ensure unique IDs for codeblocks

  // Effect to render React CodeBlocks into placeholders
  useEffect(() => {
    if (!previewRef.current) return

    const newRoots = new Map<string, Root>()
    const placeholders = previewRef.current.querySelectorAll<HTMLDivElement>('.codeblock-placeholder')

    placeholders.forEach(placeholder => {
      const id = placeholder.id
      const code = placeholder.dataset.code ? decodeURIComponent(placeholder.dataset.code) : ''
      const language = placeholder.dataset.language || 'text'

      if (codeBlockRoots.has(id)) {
        // If root already exists for this ID, it might be from a previous render with same content.
        // We update it.
        const root = codeBlockRoots.get(id)!
        root.render(
          React.createElement(CodeBlock, {
            code,
            language,
            isDarkMode,
            showLineNumbers: true
          })
        )
        newRoots.set(id, root) // Keep track of it for this render cycle
        codeBlockRoots.delete(id) // Remove from old roots map
      } else {
        // Create new root
        const root = createRoot(placeholder)
        root.render(
          React.createElement(CodeBlock, {
            code,
            language,
            isDarkMode,
            showLineNumbers: true
          })
        )
        newRoots.set(id, root)
      }
      // Make the placeholder content effectively replaced by the React component
      placeholder.style.display = 'contents'
    })

    // Unmount any old roots that are no longer in the DOM (placeholders removed)
    codeBlockRoots.forEach((root, id) => {
      // Check if the element still exists, if not, it was removed by `marked`
      if (!document.getElementById(id)) {
        try {
          root.unmount()
        } catch (e) {
          console.warn(`Error unmounting old CodeBlock root for ID ${id}:`, e)
        }
      } else {
        // This case should ideally not happen if logic is correct,
        // but if it does, it means a placeholder was not processed.
        // For safety, we can add it to newRoots to prevent unmounting if it's still valid.
        // However, this indicates a potential logic flaw elsewhere.
        newRoots.set(id, root);
      }
    })

    // Update the global map with the currently active roots
    codeBlockRoots.clear()
    newRoots.forEach((root, id) => codeBlockRoots.set(id, root))

  }, [htmlContent, isDarkMode]) // Rerun when HTML content or dark mode changes

  // Cleanup effect for all CodeBlock roots when MarkdownPreview unmounts
  useEffect(() => {
    return () => {
      codeBlockRoots.forEach((root, id) => {
        try {
          root.unmount()
        } catch (error) {
          console.warn(`Error unmounting CodeBlock root (ID: ${id}) on component unmount:`, error)
        }
      })
      codeBlockRoots.clear()
      // Increment renderedHtmlId to ensure fresh IDs on next mount, preventing ID collision if component is remounted quickly
      // This is a bit of a workaround for potential state issues with the global codeBlockRoots map if not cleaned perfectly.
      setRenderedHtmlId(prev => prev + 1)
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
