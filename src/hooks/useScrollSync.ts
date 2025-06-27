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
 * Custom hook để đồng bộ scroll giữa Monaco Editor và Preview
 * Sử dụng tỷ lệ phần trăm để đảm bảo nội dung tương ứng được hiển thị
 */
export const useScrollSync = (options: ScrollSyncOptions = {}): ScrollSyncReturn => {
  const { enabled = true, debounceMs = 50 } = options
  
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const previewRef = useRef<HTMLDivElement | null>(null)
  const isScrolling = useRef(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Tính toán scroll percentage
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

  // Đồng bộ từ editor sang preview
  const syncEditorToPreview = useCallback(() => {
    console.log('syncEditorToPreview called', { 
      enabled, 
      hasEditor: !!editorRef.current, 
      hasPreview: !!previewRef.current, 
      isScrolling: isScrolling.current 
    })
    
    if (!enabled || !editorRef.current || !previewRef.current || isScrolling.current) return

    const editor = editorRef.current
    const preview = previewRef.current
    
    // Lấy scroll info từ Monaco Editor
    const scrollTop = editor.getScrollTop()
    const scrollHeight = editor.getScrollHeight()
    const layoutInfo = editor.getLayoutInfo()
    const visibleHeight = layoutInfo.height
    
    const maxScroll = scrollHeight - visibleHeight
    const scrollPercentage = maxScroll > 0 ? scrollTop / maxScroll : 0
    
    // Đặt flag để tránh infinite loop
    isScrolling.current = true
    
    // Áp dụng scroll percentage cho preview
    setScrollPercentage(preview, scrollPercentage)
    
    // Reset flag sau debounce time
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
    scrollTimeoutRef.current = setTimeout(() => {
      isScrolling.current = false
    }, debounceMs)
  }, [enabled, debounceMs, setScrollPercentage])

  // Đồng bộ từ preview sang editor
  const syncPreviewToEditor = useCallback(() => {
    console.log('syncPreviewToEditor called', { 
      enabled, 
      hasEditor: !!editorRef.current, 
      hasPreview: !!previewRef.current, 
      isScrolling: isScrolling.current 
    })
    
    if (!enabled || !editorRef.current || !previewRef.current || isScrolling.current) return

    const editor = editorRef.current
    const preview = previewRef.current
    
    // Lấy scroll percentage từ preview
    const scrollPercentage = getScrollPercentage(preview)
    
    // Đặt flag để tránh infinite loop
    isScrolling.current = true
    
    // Áp dụng scroll percentage cho editor
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

  // Setup event listeners - sử dụng polling để đợi refs được set
  useEffect(() => {
    if (!enabled) {
      console.log('ScrollSync: disabled')
      return
    }

    let cleanup: (() => void) | null = null
    
    const setupListeners = () => {
      const editor = editorRef.current
      const preview = previewRef.current
      
      console.log('ScrollSync: Attempting to setup listeners', { editor: !!editor, preview: !!preview })
      
      if (!editor || !preview) {
        console.log('ScrollSync: Refs not ready yet, will retry...')
        return false
      }

      console.log('ScrollSync: Setting up event listeners')
      
      // Listener cho Monaco Editor scroll
      const editorScrollDisposable = editor.onDidScrollChange(() => {
        console.log('ScrollSync: Editor scroll detected')
        syncEditorToPreview()
      })

      // Listener cho Preview scroll
      const handlePreviewScroll = () => {
        console.log('ScrollSync: Preview scroll detected')
        syncPreviewToEditor()
      }

      preview.addEventListener('scroll', handlePreviewScroll, { passive: true })
      console.log('ScrollSync: Event listeners attached successfully')

      // Setup cleanup function
      cleanup = () => {
        console.log('ScrollSync: Cleaning up listeners')
        editorScrollDisposable.dispose()
        preview.removeEventListener('scroll', handlePreviewScroll)
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current)
        }
      }
      
      return true
    }

    // Thử setup ngay lập tức
    if (!setupListeners()) {
      // Nếu không thành công, thử lại sau một khoảng thời gian
      const retryInterval = setInterval(() => {
        if (setupListeners()) {
          clearInterval(retryInterval)
        }
      }, 100)
      
      // Cleanup interval sau 5 giây
      const timeoutId = setTimeout(() => {
        clearInterval(retryInterval)
        console.log('ScrollSync: Timeout waiting for refs')
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