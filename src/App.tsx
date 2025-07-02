import React, { useState, useEffect, useCallback } from 'react'
import { 
  useScrollSync, 
  useMarkdownEngine, 
  useTheme, 
  useLayout, 
  useFileOperations, 
  useKeyboardShortcuts, 
  useApiKey, 
  useAutoCompleteStatus,
  useToast 
} from './hooks'
import { AppHeader, AppLayout } from './components/layout'
import DocumentationModal from './components/DocumentationModal'
import { useActiveDocument } from './core/contexts/TabManagerContext'
import StatusBar from './components/StatusBar'
import { Toaster } from './components/ui/toaster'
import { AuthGuard } from './components/AuthGuard'
import { UserProfile } from './components/UserProfile'
import { useAuth } from './contexts/AuthContext'

import 'github-markdown-css'

function App() {
  const { document: activeDocument, updateDocumentContent, isLoading } = useActiveDocument()
  
  // Custom hooks for state management
  const { isDarkMode, toggleTheme } = useTheme()
  const { 
    activePanel, 
    setActivePanel, 
    mobileView, 
    setMobileView, 
    isFullscreen, 
    toggleFullscreen, 
    isMobile 
  } = useLayout()
  const { copyMarkdown, downloadMarkdown } = useFileOperations()
  const { apiKey, handleApiKeyChange } = useApiKey()
  const { autoCompleteStatus, setAutoCompleteStatus } = useAutoCompleteStatus()
  
  // Local state
  const [renderedHtml, setRenderedHtml] = useState('')
  const [isProcessingMarkdown, setIsProcessingMarkdown] = useState(false)
  const [isDocumentationOpen, setIsDocumentationOpen] = useState(false)
  
  const { toast } = useToast()
  const { processMarkdown } = useMarkdownEngine()
  
  // Scroll sync hook
  const { editorRef, previewRef } = useScrollSync({ enabled: !isMobile })
  
  // Keyboard shortcuts
  useKeyboardShortcuts({
    onDocumentationOpen: () => setIsDocumentationOpen(true)
  })

  // Markdown processing with debounce
  const processMarkdownInWorker = useCallback(
    async (markdown: string) => {
      setIsProcessingMarkdown(true);
      try {
        const html = await processMarkdown(markdown);
        setRenderedHtml(html);
      } catch (e) {
        console.error('Failed to process markdown:', e);
        toast({
          title: "Markdown Processing Error",
          description: "Failed to render markdown content",
          variant: "destructive"
        });
      } finally {
        setIsProcessingMarkdown(false);
      }
    },
    [processMarkdown, toast]
  );

  useEffect(() => {
    if (activeDocument?.content) {
      // Debounce để tránh gọi quá nhiều lần
      const timeoutId = setTimeout(() => {
        processMarkdownInWorker(activeDocument.content);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [activeDocument?.content, processMarkdownInWorker]);

  // Handler functions for components
  const handleCopyMarkdown = () => {
    if (activeDocument?.content) {
      copyMarkdown(activeDocument.content)
    }
  }

  const handleDownloadMarkdown = () => {
    if (activeDocument?.content) {
      downloadMarkdown(activeDocument.content, activeDocument.title || 'document')
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading Document...</div>
  }

  return (
    <AuthGuard>
      <div className={`h-screen flex flex-col transition-colors duration-300 ${
        isDarkMode 
          ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
          : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'
      }`}>
        {/* Header */}
        <AppHeader
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
          isFullscreen={isFullscreen}
          toggleFullscreen={toggleFullscreen}
          activePanel={activePanel}
          setActivePanel={setActivePanel}
          isMobile={isMobile}
          onCopyMarkdown={handleCopyMarkdown}
          onDownloadMarkdown={handleDownloadMarkdown}
          onDocumentationOpen={() => setIsDocumentationOpen(true)}
          apiKey={apiKey}
          onApiKeyChange={handleApiKeyChange}
        />

        {/* Main Content */}
        <main className="flex-1 w-full overflow-hidden">
          <div className="h-full overflow-hidden">
            <AppLayout
              isMobile={isMobile}
              isDarkMode={isDarkMode}
              activePanel={activePanel}
              mobileView={mobileView}
              setMobileView={setMobileView}
              activeDocumentContent={activeDocument?.content || ''}
              updateDocumentContent={updateDocumentContent}
              renderedHtml={renderedHtml}
              isProcessingMarkdown={isProcessingMarkdown}
              editorRef={editorRef}
              previewRef={previewRef}
              apiKey={apiKey}
              onAutoCompleteChange={setAutoCompleteStatus}
            />
          </div>
        </main>

        {/* Enhanced Status Bar - Fixed Footer */}
        <footer className={`border-t backdrop-blur-sm transition-colors duration-300 sticky bottom-0 z-10 ${
          isDarkMode 
            ? 'bg-gray-900/80 border-gray-700' 
            : 'bg-white/80 border-gray-200'
        }`}>
          <StatusBar 
            markdown={activeDocument?.content || ''} 
            isDarkMode={isDarkMode} 
            autoComplete={autoCompleteStatus} 
          />
        </footer>
        
        <Toaster />
        
        {/* Documentation Modal */}
        <DocumentationModal 
          isOpen={isDocumentationOpen}
          onClose={() => setIsDocumentationOpen(false)}
        />
      </div>
    </AuthGuard>
  )
}

export default App
