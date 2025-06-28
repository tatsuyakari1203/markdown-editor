import React, { useRef, useCallback, useEffect } from 'react'
import type { editor } from 'monaco-editor'

interface ScrollSyncOptions {
  enabled?: boolean
  debounceMs?: number
}

interface ScrollSyncReturn {
  editorRef: React.MutableRefObject<editor.IStandaloneCodeEditor | null>
  previewRef: React.MutableRefObject<HTMLDivElement | null>
  isScrolling: React.MutableRefObject<boolean>
}

/**
 * Custom hook to synchronize scrolling between Monaco Editor and Preview
 * Uses percentage ratio to ensure corresponding content is displayed
 */
export const useScrollSync = (options: ScrollSyncOptions = {}): ScrollSyncReturn => {
  const { enabled = true, debounceMs = 50 } = options
  
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const previewRef = useRef<HTMLDivElement | null>(null)
  const isScrolling = useRef(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Calculate scroll percentage
  const getScrollPercentage = useCallback((element: HTMLElement): number => {
    const { scrollTop, scrollHeight, clientHeight } = element
    const maxScroll = scrollHeight - clientHeight
    return maxScroll > 0 ? scrollTop / maxScroll : 0
  }, [])

  // Set scroll percentage cho element
  const setScrollPercentage = useCallback((element: HTMLElement, percentage: number): void => {
    const { scrollHeight, clientHeight } = element
    const maxScroll = scrollHeight - clientHeight
    const targetScrollTop = Math.max(0, Math.min(maxScroll, maxScroll * percentage))
    element.scrollTop = targetScrollTop
  }, [])

  // Sync from editor to preview
  const syncEditorToPreview = useCallback(() => {
    if (!enabled || !editorRef.current || !previewRef.current || isScrolling.current) return

    const editor = editorRef.current
    const preview = previewRef.current
    
    // Get scroll info from Monaco Editor
    const scrollTop = editor.getScrollTop()
    const scrollHeight = editor.getScrollHeight()
    const layoutInfo = editor.getLayoutInfo()
    const visibleHeight = layoutInfo.height
    
    const maxScroll = scrollHeight - visibleHeight
    const scrollPercentage = maxScroll > 0 ? scrollTop / maxScroll : 0
    
    // Set flag to avoid infinite loop
    isScrolling.current = true
    
    // Apply scroll percentage to preview
    setScrollPercentage(preview, scrollPercentage)
    
    // Reset flag sau debounce time
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
    scrollTimeoutRef.current = setTimeout(() => {
      isScrolling.current = false
    }, debounceMs)
  }, [enabled, debounceMs, setScrollPercentage])

  // Sync from preview to editor
  const syncPreviewToEditor = useCallback(() => {
    if (!enabled || !editorRef.current || !previewRef.current || isScrolling.current) return

    const editor = editorRef.current
    const preview = previewRef.current
    
    // Get scroll percentage from preview
    const scrollPercentage = getScrollPercentage(preview)
    
    // Set flag to avoid infinite loop
    isScrolling.current = true
    
    // Apply scroll percentage to editor
    const scrollHeight = editor.getScrollHeight()
    const layoutInfo = editor.getLayoutInfo()
    const visibleHeight = layoutInfo.height
    const maxScroll = scrollHeight - visibleHeight
    const targetScrollTop = Math.max(0, Math.min(maxScroll, maxScroll * scrollPercentage))
    
    editor.setScrollTop(targetScrollTop)
    
    // Reset flag sau debounce time
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
    scrollTimeoutRef.current = setTimeout(() => {
      isScrolling.current = false
    }, debounceMs)
  }, [enabled, debounceMs, getScrollPercentage])

  // Setup event listeners - use polling to wait for refs to be set
  useEffect(() => {
    if (!enabled) {
      return
    }

    let cleanup: (() => void) | null = null
    
    const setupListeners = () => {
      const editor = editorRef.current
      const preview = previewRef.current
      
      if (!editor || !preview) {
        return false
      }
      
      // Listener cho Monaco Editor scroll
      const editorScrollDisposable = editor.onDidScrollChange(() => {
        syncEditorToPreview()
      })

      // Listener cho Preview scroll
      const handlePreviewScroll = () => {
        syncPreviewToEditor()
      }

      preview.addEventListener('scroll', handlePreviewScroll, { passive: true })

      // Setup cleanup function
      cleanup = () => {
        editorScrollDisposable.dispose()
        preview.removeEventListener('scroll', handlePreviewScroll)
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current)
        }
      }
      
      return true
    }

    // Try immediate setup
    if (!setupListeners()) {
      // If unsuccessful, try again after a delay
      const retryInterval = setInterval(() => {
        if (setupListeners()) {
          clearInterval(retryInterval)
        }
      }, 100)
      
      // Cleanup interval after 5 seconds
      const timeoutId = setTimeout(() => {
        clearInterval(retryInterval)
      }, 5000)
      
      return () => {
        clearInterval(retryInterval)
        clearTimeout(timeoutId)
        if (cleanup) cleanup()
      }
    }

    // Cleanup khi component unmount
    return () => {
      if (cleanup) cleanup()
    }
  }, [enabled, syncEditorToPreview, syncPreviewToEditor])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  return {
    editorRef,
    previewRef,
    isScrolling
  }
}

export default useScrollSync