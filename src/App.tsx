import React, { useState, useEffect } from 'react'
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
  Zap
} from 'lucide-react'
import MarkdownEditor from './components/MarkdownEditor'
import MarkdownPreview from './components/MarkdownPreview'

import MobileTabSwitcher from './components/MobileTabSwitcher'
import StatusBar from './components/StatusBar'
import ExportDialog from './components/ExportDialog'
import { Button } from './components/ui/button'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './components/ui/resizable'
import { useToast } from './hooks/use-toast'
import { Toaster } from './components/ui/toaster'
import { normalizeTableContent } from './lib/table-normalizer'
import { getMarkdownContent, setMarkdownContent, getTheme, setTheme } from './lib/storage'
import { useResponsive } from './hooks/use-mobile'
import { StorageDebugger } from './components/StorageDebugger'
import 'github-markdown-css'

const defaultMarkdown = `# 🚀 Premium Markdown Editor

Welcome to the **ultimate** Markdown editing experience! This editor combines *beautiful design* with powerful functionality.

## ✨ Features at a Glance

### 🎨 Modern Design
- **Dark/Light Theme**: Toggle between elegant themes
- **Resizable Panels**: Drag to customize your workspace
- **Premium UI**: Sophisticated design with smooth animations
- **Mobile Optimized**: Perfect experience on any device

### ⚡ Powerful Tools
- \`Real-time Preview\` with instant updates
- **Syntax Highlighting** in the editor
- *Auto-save* to never lose your work
- **Export Options**: Download as Markdown or HTML

### 🔥 Advanced Editing

#### Smart Lists
1. **Ordered lists** with auto-numbering
2. *Nested items* work perfectly
   - Unordered sub-items
   - Multiple levels supported
3. Seamless list continuation

#### Code Excellence
\`\`\`javascript
// Syntax highlighting for 180+ languages
function createAwesome() {
    return "This editor is amazing! 🎉";
}

console.log(createAwesome());
\`\`\`

\`\`\`python
# Python example with beautiful highlighting
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(f"Fibonacci(10) = {fibonacci(10)}")
\`\`\`

### 📊 Rich Content

> **Pro Tip**: This blockquote showcases the elegant styling that makes content stand out beautifully.
> 
> Create compelling quotes and callouts with ease!

| Feature | Status | Notes |
|---------|--------|-------|
| **Real-time Preview** | ✅ | Instant updates |
| **Theme Toggle** | ✅ | Dark & Light modes |
| **Export Options** | ✅ | MD & HTML |
| **Mobile Support** | ✅ | Responsive design |
| **Auto-save** | ✅ | Never lose work |

### 🎯 Quick Actions

**Keyboard shortcuts** make editing blazingly fast:
- \`Ctrl+B\` for **bold**
- \`Ctrl+I\` for *italic*
- \`Ctrl+\`\` for \`code\`
- \`Ctrl+S\` to save

---

### 🌟 Why You'll Love This Editor

- **Lightning Fast**: Optimized performance for large documents
- **Distraction-Free**: Clean interface that gets out of your way
- **Professional**: Perfect for documentation, blogs, and notes
- **Accessible**: Full keyboard navigation and screen reader support

### 🚀 Start Creating

Begin typing in the editor to see the magic happen! Your content is automatically saved and beautifully rendered in real-time.

*Ready to create something amazing? Let's go! 🎉*`

function App() {
  const [markdown, setMarkdown] = useState(() => {
    const saved = getMarkdownContent()
    return saved || defaultMarkdown
  })
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = getTheme()
    return saved === 'dark'
  })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activePanel, setActivePanel] = useState<'editor' | 'preview' | 'both'>('both')
  const [mobileView, setMobileView] = useState<'editor' | 'preview'>('editor')
  const [showStorageDebugger, setShowStorageDebugger] = useState(false)
  const { toast } = useToast()
  const { isMobile, isTablet, isDesktop } = useResponsive()

  // Auto-save functionality with table normalization
  useEffect(() => {
    const timer = setTimeout(() => {
      const normalizedMarkdown = normalizeTableContent(markdown)
      setMarkdownContent(normalizedMarkdown)
    }, 1000)
    return () => clearTimeout(timer)
  }, [markdown])

  // Theme persistence
  useEffect(() => {
    setTheme(isDarkMode ? 'dark' : 'light')
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
    toast({
      title: isDarkMode ? "Light mode enabled" : "Dark mode enabled",
      description: "Theme preference saved automatically",
    })
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const copyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdown)
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
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'document.md'
    a.click()
    URL.revokeObjectURL(url)
    toast({
      title: "Download started",
      description: "Markdown file downloaded successfully",
    })
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
            {/* Logo Only */}
            <div className="flex items-center">
              <Edit3 className={`w-5 h-5 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`} />
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
                onClick={() => setShowStorageDebugger(true)}
                className="h-8"
                title="Debug Storage"
              >
                <Settings className="w-4 h-4" />
              </Button>

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
                  <MarkdownEditor
                    value={markdown}
                    onChange={setMarkdown}
                    isDarkMode={isDarkMode}
                  />
                </div>
              ) : (
                <div className={`flex-1 overflow-hidden transition-colors duration-300 ${
                  isDarkMode ? 'bg-gray-800/50' : 'bg-white'
                }`}>
                  <MarkdownPreview 
                    markdown={markdown} 
                    isDarkMode={isDarkMode}
                  />
                </div>
              )}
            </div>
          ) : (
            /* Desktop Layout */
            <ResizablePanelGroup direction="horizontal" className="h-full overflow-hidden">
              {/* Editor Panel */}
              {(activePanel === 'editor' || activePanel === 'both') && (
                <>
                  <ResizablePanel defaultSize={50} minSize={30}>
                    <div className={`h-full overflow-hidden transition-colors duration-300 ${
                      isDarkMode 
                        ? `bg-gray-800/50 ${activePanel === 'both' ? 'border-r border-gray-700' : ''}` 
                        : `bg-white ${activePanel === 'both' ? 'border-r border-gray-200' : ''}`
                    }`}>
                      <div className={`px-4 py-3 border-b transition-colors duration-300 ${
                        isDarkMode 
                          ? 'bg-gray-800/80 border-gray-700' 
                          : 'bg-gray-50/80 border-gray-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className={`text-lg font-semibold ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              Editor
                            </h2>
                            <p className={`text-sm ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              Type your Markdown here
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${
                              isDarkMode ? 'bg-green-400' : 'bg-green-500'
                            } animate-pulse`}></div>
                            <span className={`text-xs ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              Auto-save
                            </span>
                          </div>
                        </div>
                      </div>
                      <MarkdownEditor
                        value={markdown}
                        onChange={setMarkdown}
                        isDarkMode={isDarkMode}
                      />
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
                <ResizablePanel defaultSize={50} minSize={30}>
                  <div className={`h-full overflow-hidden transition-colors duration-300 ${
                    isDarkMode 
                      ? `bg-gray-800/50 ${activePanel === 'both' ? 'border-l border-gray-700' : ''}` 
                      : `bg-white ${activePanel === 'both' ? 'border-l border-gray-200' : ''}`
                  }`}>
                    <div className={`px-4 py-3 border-b transition-colors duration-300 ${
                      isDarkMode 
                        ? 'bg-gray-800/80 border-gray-700' 
                        : 'bg-gray-50/80 border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className={`text-lg font-semibold ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            Preview
                          </h2>
                          <p className={`text-sm ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            Live Markdown preview
                          </p>
                        </div>
                        <ExportDialog markdown={markdown} isDarkMode={isDarkMode} />
                      </div>
                    </div>
                    <MarkdownPreview 
                      markdown={markdown} 
                      isDarkMode={isDarkMode}
                    />
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
          ? 'bg-gray-900/80 border-gray-700 shadow-2xl' 
          : 'bg-white/80 border-gray-200 shadow-lg'
      }`}>
        <StatusBar markdown={markdown} isDarkMode={isDarkMode} />
      </footer>
      
      {/* Storage Debugger */}
      <StorageDebugger 
        isOpen={showStorageDebugger} 
        onClose={() => setShowStorageDebugger(false)} 
      />
      
      <Toaster />
    </div>
  )
}

export default App
