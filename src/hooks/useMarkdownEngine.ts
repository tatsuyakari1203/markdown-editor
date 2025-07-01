// New Markdown Engine Hook - Replaces useProcessorWorker
import { useCallback, useRef } from 'react'
import MarkdownProcessorService from '../services/MarkdownProcessorService'

interface UseMarkdownEngineReturn {
  processMarkdown: (markdown: string, requestId?: string) => Promise<string>
  cleanup: () => void
}

export const useMarkdownEngine = () => {
  const processingRef = useRef<Set<string>>(new Set())
  const serviceRef = useRef<MarkdownProcessorService>(MarkdownProcessorService.getInstance())

  const processMarkdown = useCallback(async (
    markdown: string,
    requestId?: string
  ): Promise<string> => {
    const id = requestId || `markdown_${Date.now()}_${Math.random()}`
    
    // Prevent duplicate processing
    if (processingRef.current.has(id)) {
      throw new Error('Request already in progress')
    }

    processingRef.current.add(id)

    try {
      const result = await serviceRef.current.processMarkdown(markdown, {
        includeCSS: false,
        includeKaTeX: true,
        timeout: 30000
      })
      
      return result.html
    } finally {
      processingRef.current.delete(id)
    }
  }, [])

  // Cleanup function
  const cleanup = useCallback(() => {
    processingRef.current.clear()
    serviceRef.current.cleanup()
  }, [])

  return {
    processMarkdown,
    cleanup
  };
}

export default useMarkdownEngine;