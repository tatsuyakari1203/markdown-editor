import { useState, useCallback } from 'react'
import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'

export interface ClipboardResult {
  success: boolean
  markdown?: string
  html?: string
  error?: string
  isEmpty?: boolean
}

export interface ClipboardReaderHook {
  isLoading: boolean
  lastResult: ClipboardResult | null
  readClipboard: () => Promise<ClipboardResult>
  convertHtmlToMarkdown: (html: string) => string
  hasClipboardAccess: boolean
  error: string | null
}

export const useClipboardReader = (): ClipboardReaderHook => {
  const [isLoading, setIsLoading] = useState(false)
  const [lastResult, setLastResult] = useState<ClipboardResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasClipboardAccess, setHasClipboardAccess] = useState(
    typeof navigator !== 'undefined' && 
    'clipboard' in navigator && 
    'read' in navigator.clipboard
  )

  // Initialize Turndown service with GitHub Flavored Markdown support
  const initializeTurndownService = useCallback(() => {
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      fence: '```',
      emDelimiter: '*',
      strongDelimiter: '**',
      linkStyle: 'inlined',
      linkReferenceStyle: 'full',
      preformattedCode: false
    })

    // Add GitHub Flavored Markdown support
    turndownService.use(gfm)

    // Custom rules for better conversion
    turndownService.addRule('lineBreaks', {
      filter: 'br',
      replacement: () => '\n'
    })

    turndownService.addRule('divs', {
      filter: 'div',
      replacement: (content) => content ? '\n\n' + content + '\n\n' : ''
    })

    turndownService.addRule('spans', {
      filter: 'span',
      replacement: (content) => content
    })

    // Handle nested lists better
    turndownService.addRule('nestedLists', {
      filter: ['ul', 'ol'],
      replacement: (content, node) => {
        const parent = node.parentNode
        if (parent && (parent.nodeName === 'LI' || parent.nodeName === 'li')) {
          return '\n' + content
        }
        return '\n\n' + content + '\n\n'
      }
    })

    // Preserve task lists
    turndownService.addRule('taskLists', {
      filter: (node) => {
        return node.nodeName === 'INPUT' && 
               node.getAttribute && 
               node.getAttribute('type') === 'checkbox'
      },
      replacement: (content, node) => {
        const checked = node.getAttribute && node.getAttribute('checked') !== null
        return checked ? '[x] ' : '[ ] '
      }
    })

    // Clean up excessive whitespace
    turndownService.addRule('cleanWhitespace', {
      filter: () => true,
      replacement: (content) => {
        // Remove excessive line breaks
        return content.replace(/\n{3,}/g, '\n\n')
                     .replace(/^\s+|\s+$/g, '') // Trim whitespace
      }
    })

    return turndownService
  }, [])

  const convertHtmlToMarkdown = useCallback((html: string): string => {
    try {
      const turndownService = initializeTurndownService()
      
      // Pre-process HTML to clean up common issues
      let cleanHtml = html
        // Remove Google Docs specific styling
        .replace(/<span[^>]*google-docs[^>]*>/gi, '<span>')
        // Remove MS Word specific elements
        .replace(/<o:p[^>]*>/gi, '')
        .replace(/<\/o:p>/gi, '')
        // Clean up excessive spans
        .replace(/<span[^>]*>\s*<\/span>/gi, '')
        // Remove empty paragraphs
        .replace(/<p[^>]*>\s*<\/p>/gi, '')
        // Convert non-breaking spaces
        .replace(/&nbsp;/gi, ' ')

      const markdown = turndownService.turndown(cleanHtml)
      
      // Post-process markdown for better formatting
      return markdown
        .replace(/\n{3,}/g, '\n\n') // Limit consecutive line breaks
        .replace(/^\s+|\s+$/g, '') // Trim whitespace
        .replace(/\\\[/g, '[') // Unescape brackets
        .replace(/\\\]/g, ']')
    } catch (error) {
      console.error('HTML to Markdown conversion error:', error)
      return 'Error converting HTML to Markdown'
    }
  }, [initializeTurndownService])

  const readClipboard = useCallback(async (): Promise<ClipboardResult> => {
    setIsLoading(true)
    setError(null)

    try {
      // Check if we're in a secure context
      if (!window.isSecureContext) {
        throw new Error('Clipboard access requires HTTPS')
      }

      // Check clipboard API availability
      if (!navigator.clipboard || !navigator.clipboard.read) {
        throw new Error('Clipboard API not supported in this browser')
      }

      // Request clipboard permission
      const permission = await navigator.permissions.query({ name: 'clipboard-read' as PermissionName })
      if (permission.state === 'denied') {
        throw new Error('Clipboard access denied. Please allow clipboard permissions.')
      }

      // Read clipboard content
      const clipboardItems = await navigator.clipboard.read()
      
      if (!clipboardItems || clipboardItems.length === 0) {
        const result: ClipboardResult = {
          success: false,
          isEmpty: true,
          error: 'Clipboard is empty'
        }
        setLastResult(result)
        return result
      }

      const clipboardItem = clipboardItems[0]
      let html = ''
      let plainText = ''

      // Try to get HTML content first
      if (clipboardItem.types.includes('text/html')) {
        const htmlBlob = await clipboardItem.getType('text/html')
        html = await htmlBlob.text()
      }

      // Fallback to plain text
      if (!html && clipboardItem.types.includes('text/plain')) {
        const textBlob = await clipboardItem.getType('text/plain')
        plainText = await textBlob.text()
      }

      // If we have neither HTML nor plain text
      if (!html && !plainText) {
        const result: ClipboardResult = {
          success: false,
          error: 'No readable text content found in clipboard'
        }
        setLastResult(result)
        return result
      }

      // Convert to markdown
      let markdown = ''
      if (html) {
        markdown = convertHtmlToMarkdown(html)
      } else {
        markdown = plainText
      }

      const result: ClipboardResult = {
        success: true,
        markdown,
        html: html || undefined
      }
      
      setLastResult(result)
      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown clipboard error'
      setError(errorMessage)
      
      const result: ClipboardResult = {
        success: false,
        error: errorMessage
      }
      
      setLastResult(result)
      return result
    } finally {
      setIsLoading(false)
    }
  }, [convertHtmlToMarkdown])

  return {
    isLoading,
    lastResult,
    readClipboard,
    convertHtmlToMarkdown,
    hasClipboardAccess,
    error
  }
}
