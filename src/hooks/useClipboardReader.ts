import { useState, useCallback } from 'react'
import { convertDocsHtmlToMarkdown } from '../lib/convert.ts'

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
  convertHtmlToMarkdown: (html: string) => Promise<string>
  hasClipboardAccess: boolean
  error: string | null
}

// Google Docs slice clip media type
const SLICE_CLIP_MEDIA_TYPE = 'application/x-vnd.google-docs-document-slice-clip'

export const useClipboardReader = (): ClipboardReaderHook => {
  const [isLoading, setIsLoading] = useState(false)
  const [lastResult, setLastResult] = useState<ClipboardResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasClipboardAccess, setHasClipboardAccess] = useState(
    typeof navigator !== 'undefined' && 
    'clipboard' in navigator && 
    'read' in navigator.clipboard
  )

  // Check if HTML content is from Google Docs
  const isGoogleDocsContent = useCallback((html: string): boolean => {
    return /id=['"]docs-internal-guid-/.test(html) ||
           html.includes('docs-internal-guid') ||
           html.includes('google-docs') ||
           /<style[^>]*>[\s\S]*?\.c\d+\{[\s\S]*?<\/style>/.test(html)
  }, [])

  // Convert HTML to Markdown using the professional library
  const convertHtmlToMarkdown = useCallback(async (html: string): Promise<string> => {
    try {
      // Use the professional Google Docs to Markdown converter
      const options = {
        codeBlocks: 'fenced' as const,
        headingIds: 'hidden' as const,
        suggestions: 'reject' as const
      }
      
      const markdown = await convertDocsHtmlToMarkdown(html, null, options)
      return markdown
    } catch (error) {
      console.error('Error converting HTML to Markdown:', error)
      // Fallback to simple text extraction if conversion fails
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = html
      return tempDiv.textContent || tempDiv.innerText || ''
    }
  }, [])

  const readClipboard = useCallback(async (): Promise<ClipboardResult> => {
    if (!hasClipboardAccess) {
      const error = 'Clipboard access not available'
      setError(error)
      return { success: false, error }
    }

    setIsLoading(true)
    setError(null)

    try {
      const clipboardItems = await navigator.clipboard.read()
      
      if (!clipboardItems || clipboardItems.length === 0) {
        const result = { success: false, isEmpty: true }
        setLastResult(result)
        return result
      }

      let htmlContent = ''
      let textContent = ''
      let sliceClipData = ''

      for (const item of clipboardItems) {
        // Try to get Google Docs slice clip data first (most detailed)
        if (item.types.includes(SLICE_CLIP_MEDIA_TYPE)) {
          try {
            const sliceBlob = await item.getType(SLICE_CLIP_MEDIA_TYPE)
            sliceClipData = await sliceBlob.text()
          } catch (error) {
            console.warn('Failed to read slice clip from clipboard:', error)
          }
        }

        // Try to get HTML content
        if (item.types.includes('text/html')) {
          try {
            const htmlBlob = await item.getType('text/html')
            htmlContent = await htmlBlob.text()
          } catch (error) {
            console.warn('Failed to read HTML from clipboard:', error)
          }
        }

        // Fallback to plain text
        if (!htmlContent && item.types.includes('text/plain')) {
          try {
            const textBlob = await item.getType('text/plain')
            textContent = await textBlob.text()
          } catch (error) {
            console.warn('Failed to read text from clipboard:', error)
          }
        }
      }

      // Use HTML if available, otherwise use plain text
      const contentToConvert = htmlContent || textContent
      
      if (!contentToConvert || contentToConvert.trim() === '') {
        const result = { success: false, isEmpty: true }
        setLastResult(result)
        return result
      }

      // Convert to markdown using the professional library
      let markdown: string
      if (htmlContent) {
        // Check if this is Google Docs content and use slice clip if available
        if (isGoogleDocsContent(htmlContent) && sliceClipData) {
          // Use the professional converter with slice clip data
          const options = {
            codeBlocks: 'fenced' as const,
            headingIds: 'hidden' as const,
            suggestions: 'reject' as const
          }
          markdown = await convertDocsHtmlToMarkdown(htmlContent, sliceClipData, options)
        } else {
          // Use the professional converter without slice clip
          markdown = await convertHtmlToMarkdown(htmlContent)
        }
      } else {
        // Plain text doesn't need conversion
        markdown = textContent
      }

      const result: ClipboardResult = {
        success: true,
        markdown,
        html: htmlContent || undefined
      }

      setLastResult(result)
      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('Clipboard read error:', error)
      setError(errorMessage)
      
      const result = { success: false, error: errorMessage }
      setLastResult(result)
      return result
    } finally {
      setIsLoading(false)
    }
  }, [hasClipboardAccess, convertHtmlToMarkdown, isGoogleDocsContent])

  return {
    isLoading,
    lastResult,
    readClipboard,
    convertHtmlToMarkdown,
    hasClipboardAccess,
    error
  }
}
