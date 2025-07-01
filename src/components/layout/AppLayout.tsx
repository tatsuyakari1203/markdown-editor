import React, { Suspense, lazy } from 'react'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '../ui/resizable'
import MobileTabSwitcher from '../MobileTabSwitcher'
import TabBar from '../TabBar'
import ExportDialog from '../ExportDialog'
import { PanelType, MobileViewType } from '../../hooks/useLayout'

// Lazy load large components
const MarkdownEditor = lazy(() => import('../MarkdownEditor'))
const MarkdownPreview = lazy(() => import('../MarkdownPreview'))

export interface AppLayoutProps {
  isMobile: boolean
  isDarkMode: boolean
  activePanel: PanelType
  mobileView: MobileViewType
  setMobileView: (view: MobileViewType) => void
  activeDocumentContent: string
  updateDocumentContent: (content: string) => void
  renderedHtml: string
  isProcessingMarkdown: boolean
  editorRef: React.RefObject<any>
  previewRef: React.RefObject<any>
  apiKey: string
  onAutoCompleteChange: (status: any) => void
}

export function AppLayout({
  isMobile,
  isDarkMode,
  activePanel,
  mobileView,
  setMobileView,
  activeDocumentContent,
  updateDocumentContent,
  renderedHtml,
  isProcessingMarkdown,
  editorRef,
  previewRef,
  apiKey,
  onAutoCompleteChange
}: AppLayoutProps) {
  if (isMobile) {
    return (
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
                value={activeDocumentContent}
                onChange={updateDocumentContent}
                isDarkMode={isDarkMode}
                editorRef={editorRef}
                apiKey={apiKey}
                onAutoCompleteChange={onAutoCompleteChange}
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
    )
  }

  // Desktop Layout
  return (
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
              <TabBar isDarkMode={isDarkMode} />
              <div className="flex-1 overflow-hidden">
                <Suspense fallback={<div className="flex items-center justify-center h-full">Loading editor...</div>}>
                  <MarkdownEditor
                    value={activeDocumentContent}
                    onChange={updateDocumentContent}
                    isDarkMode={isDarkMode}
                    editorRef={editorRef}
                    apiKey={apiKey}
                    onAutoCompleteChange={onAutoCompleteChange}
                  />
                </Suspense>
              </div>
            </div>
          </ResizablePanel>
          
          {activePanel === 'both' && (
            <ResizableHandle withHandle className={`w-0 ${
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
                <ExportDialog markdown={activeDocumentContent} isDarkMode={isDarkMode} />
              </div>
            </div>
          </div>
        </ResizablePanel>
      )}
    </ResizablePanelGroup>
  )
}