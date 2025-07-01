import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react'
import { 
  Moon, 
  Sun, 
  Download, 
  Copy, 
  Maximize2, 
  Minimize2,
  FileText,
  Eye,
  Edit3,
  Settings,
  Zap,
  Github,
  BookOpen
} from 'lucide-react'
import { useScrollSync } from './hooks/useScrollSync'
import { useMarkdownEngine } from './hooks/useMarkdownEngine'
import SettingsDialog from './components/SettingsDialog'
import DocumentationModal from './components/DocumentationModal'
import { useActiveDocument } from './core/contexts/TabManagerContext'
import TabBar from './components/TabBar'

// Lazy load large components
const MarkdownEditor = lazy(() => import('./components/MarkdownEditor'))
const MarkdownPreview = lazy(() => import('./components/MarkdownPreview'))

import MobileTabSwitcher from './components/MobileTabSwitcher'
import StatusBar from './components/StatusBar'
import ExportDialog from './components/ExportDialog'
import { Button } from './components/ui/button'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './components/ui/resizable'
import { useToast } from './hooks/use-toast'
import { Toaster } from './components/ui/toaster'
import { getTheme, setTheme } from './lib/storage'
import { useResponsive } from './hooks/use-mobile'

import 'github-markdown-css'

function App() {
  const { document: activeDocument, updateDocumentContent, isLoading } = useActiveDocument()
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = getTheme()
    return saved === 'dark'
  })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activePanel, setActivePanel] = useState<'editor' | 'preview' | 'both'>('both')
  const [mobileView, setMobileView] = useState<'editor' | 'preview'>('editor')
  const [renderedHtml, setRenderedHtml] = useState('')
  const [isProcessingMarkdown, setIsProcessingMarkdown] = useState(false)

  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('gemini-api-key') || ''
  })
  const [autoCompleteStatus, setAutoCompleteStatus] = useState({
    isEnabled: false,
    isLoading: false,
    lastActivity: 'Ready'
  })
  const [isDocumentationOpen, setIsDocumentationOpen] = useState(false)
  const { toast } = useToast()
  const { isMobile, isTablet, isDesktop } = useResponsive()
  const { processMarkdown, state: engineState } = useMarkdownEngine()
  
  // Scroll sync hook
  const { editorRef, previewRef } = useScrollSync({ enabled: !isMobile })

  // Sử dụng useCallback và debounce để tối ưu hóa việc gửi dữ liệu
  const processMarkdownInWorker = useCallback(
    async (markdown: string) => {
      if (!engineState.isReady) return;
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
    [engineState.isReady, processMarkdown, toast]
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

  // Theme persistence
  useEffect(() => {
    setTheme(isDarkMode ? 'dark' : 'light')
    if (document.documentElement) {
      if (isDarkMode) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }, [isDarkMode])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F1') {
        event.preventDefault()
        setIsDocumentationOpen(true)
      }
    }

    if (document) {
      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [])

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
    toast({
      title: isDarkMode ? "Light mode enabled" : "Dark mode enabled",
      description: "Theme preference saved automatically",
    })
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
    if (document && document.documentElement) {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen()
      } else {
        document.exitFullscreen()
      }
    }
  }

  const copyMarkdown = async () => {
    if (!activeDocument) return
    try {
      await navigator.clipboard.writeText(activeDocument.content)
      toast({
        title: "Copied to clipboard",
        description: "Markdown content copied successfully",
      })
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard",
        variant: "destructive",
      })
    }
  }

  const downloadMarkdown = () => {
    if (!activeDocument) return
    const blob = new Blob([activeDocument.content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeDocument.title || 'document'}.md`
    a.click()
    URL.revokeObjectURL(url)
    toast({
      title: "Download started",
      description: "Markdown file downloaded successfully",
    })
  }

  const handleApiKeyChange = (newApiKey: string) => {
    setApiKey(newApiKey)
    localStorage.setItem('gemini-api-key', newApiKey)
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading Document...</div>
  }

  return (
    <div className={`h-screen flex flex-col transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
        : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'
    }`}>
      {/* Combined Header with Toolbar */}
      <header className={`border-b backdrop-blur-sm transition-colors duration-300 sticky top-0 z-10 ${
        isDarkMode 
          ? 'bg-gray-900/80 border-gray-700' 
          : 'bg-white/80 border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo with KMDE */}
            <div className="flex items-center space-x-2">
              <Edit3 className={`w-5 h-5 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`} />
              <span className={`font-semibold text-lg ${
                isDarkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>KMDE</span>
            </div>



            {/* Toolbar and Action Buttons */}
            <div className="flex items-center space-x-2">
              
              
              {/* Panel Toggle - Desktop Only */}
              {!isMobile && (
                <div className="flex items-center space-x-1 ml-4">
                  <Button
                    variant={activePanel === 'editor' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActivePanel('editor')}
                    className="h-8"
                  >
                    <FileText className="w-4 h-4 mr-1" />
                    Editor
                  </Button>
                  <Button
                    variant={activePanel === 'both' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActivePanel('both')}
                    className="h-8"
                  >
                    <Zap className="w-4 h-4 mr-1" />
                    Both
                  </Button>
                  <Button
                    variant={activePanel === 'preview' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActivePanel('preview')}
                    className="h-8"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Preview
                  </Button>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={copyMarkdown}
                className="h-8"
              >
                <Copy className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={downloadMarkdown}
                className="h-8"
                title="Download Markdown"
              >
                <Download className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="h-8"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDocumentationOpen(true)}
                className="h-8"
                title="Documentation (F1)"
              >
                <BookOpen className="w-4 h-4 mr-1" />
                Docs
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open('https://github.com/tatsuyakari1203/markdown-editor', '_blank')}
                className="h-8"
                title="View on GitHub"
              >
                <Github className="w-4 h-4" />
              </Button>

              <SettingsDialog 
                apiKey={apiKey}
                onApiKeyChange={handleApiKeyChange}
                isDarkMode={isDarkMode}
              />

              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="h-8"
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full overflow-hidden">
        <div className="h-full overflow-hidden">
          {isMobile ? (
            /* Mobile Layout */
            <div className="h-full flex flex-col">
              <MobileTabSwitcher 
                activeTab={mobileView} 
                onTabChange={setMobileView} 
                isDarkMode={isDarkMode}
              />
              
              {mobileView === 'editor' ? (
                <div className={`flex-1 overflow-hidden transition-colors duration-300 ${
                  isDarkMode ? 'bg-gray-800/50' : 'bg-white'
                }`}>
                  <Suspense fallback={<div className="flex items-center justify-center h-full">Loading editor...</div>}>
                    <MarkdownEditor
                      value={activeDocument?.content || ''}
                      onChange={updateDocumentContent}
                      isDarkMode={isDarkMode}
                      editorRef={editorRef}
                      apiKey={apiKey}
                      onAutoCompleteChange={setAutoCompleteStatus}
                    />
                  </Suspense>
                </div>
              ) : (
                <div className={`flex-1 overflow-hidden transition-colors duration-300 ${
                  isDarkMode ? 'bg-gray-800/50' : 'bg-white'
                }`}>
                  <Suspense fallback={<div className="flex items-center justify-center h-full">Loading preview...</div>}>
                    <MarkdownPreview
                    html={renderedHtml}
                    isDarkMode={isDarkMode}
                    isLoading={isProcessingMarkdown}
                    previewRef={previewRef}
                  />
                  </Suspense>
                </div>
              )}
            </div>
          ) : (
            /* Desktop Layout */
            <ResizablePanelGroup direction="horizontal" className="h-full overflow-hidden">
              {/* Editor Panel */}
              {(activePanel === 'editor' || activePanel === 'both') && (
                <>
                  <ResizablePanel 
                    id="editor-panel"
                    order={1}
                    defaultSize={activePanel === 'both' ? 50 : 100} 
                    minSize={30}
                  >
                    <div className={`h-full overflow-hidden transition-colors duration-300 flex flex-col ${
                      isDarkMode 
                        ? `bg-gray-800/50 ${activePanel === 'both' ? 'border-r border-gray-700' : ''}` 
                        : `bg-white ${activePanel === 'both' ? 'border-r border-gray-200' : ''}`
                    }`}>
                      {/* Tab Bar */}
                      <TabBar />
                      <div className="flex-1 overflow-hidden">
                        <Suspense fallback={<div className="flex items-center justify-center h-full">Loading editor...</div>}>
                          <MarkdownEditor
                            value={activeDocument?.content || ''}
                            onChange={updateDocumentContent}
                            isDarkMode={isDarkMode}
                            editorRef={editorRef}
                            apiKey={apiKey}
                            onAutoCompleteChange={setAutoCompleteStatus}
                          />
                        </Suspense>
                      </div>
                    </div>
                  </ResizablePanel>
                  
                  {activePanel === 'both' && (
                    <ResizableHandle withHandle className={`${
                      isDarkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-300 hover:bg-gray-400'
                    } transition-colors duration-200`} />
                  )}
                </>
              )}

              {/* Preview Panel */}
              {(activePanel === 'preview' || activePanel === 'both') && (
                <ResizablePanel 
                  id="preview-panel"
                  order={2}
                  defaultSize={activePanel === 'both' ? 50 : 100} 
                  minSize={30}
                >
                  <div className={`h-full overflow-hidden transition-colors duration-300 ${
                    isDarkMode 
                      ? `bg-gray-800/50 ${activePanel === 'both' ? 'border-l border-gray-700' : ''}` 
                      : `bg-white ${activePanel === 'both' ? 'border-l border-gray-200' : ''}`
                  }`}>
                    <div className={`px-4 py-2 border-b transition-colors duration-300 ${
                      isDarkMode 
                        ? 'bg-gray-800/80 border-gray-700' 
                        : 'bg-gray-50/80 border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <h3 className={`text-sm font-medium ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          Preview
                        </h3>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            isDarkMode ? 'bg-blue-400' : 'bg-blue-500'
                          } animate-pulse`}></div>
                          <span className={`text-xs ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            Live
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="relative h-full">
                      <Suspense fallback={<div className="flex items-center justify-center h-full">Loading preview...</div>}>
                        <MarkdownPreview
                html={renderedHtml}
                isDarkMode={isDarkMode}
                isLoading={isProcessingMarkdown}
                previewRef={previewRef}
              />
                      </Suspense>
                      <div className="absolute top-4 right-4 z-10">
                        <ExportDialog markdown={activeDocument?.content || ''} isDarkMode={isDarkMode} />
                      </div>
                    </div>
                  </div>
                </ResizablePanel>
              )}
            </ResizablePanelGroup>
          )}
        </div>
      </main>

      {/* Enhanced Status Bar - Fixed Footer */}
      <footer className={`border-t backdrop-blur-sm transition-colors duration-300 sticky bottom-0 z-10 ${
        isDarkMode 
          ? 'bg-gray-900/80 border-gray-700' 
          : 'bg-white/80 border-gray-200'
      }`}>
        <StatusBar markdown={activeDocument?.content || ''} isDarkMode={isDarkMode} autoComplete={autoCompleteStatus} />
      </footer>
      
      
      
      <Toaster />
      
      {/* Documentation Modal */}
      <DocumentationModal 
        isOpen={isDocumentationOpen}
        onClose={() => setIsDocumentationOpen(false)}
      />
    </div>
  )
}

export default App
