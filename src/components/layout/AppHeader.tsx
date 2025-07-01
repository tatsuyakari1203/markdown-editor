import React from 'react'
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
  Zap,
  Github,
  BookOpen
} from 'lucide-react'
import { Button } from '../ui/button'
import SettingsDialog from '../SettingsDialog'
import { PanelType } from '../../hooks/useLayout'

export interface AppHeaderProps {
  isDarkMode: boolean
  toggleTheme: () => void
  isFullscreen: boolean
  toggleFullscreen: () => void
  activePanel: PanelType
  setActivePanel: (panel: PanelType) => void
  isMobile: boolean
  onCopyMarkdown: () => void
  onDownloadMarkdown: () => void
  onDocumentationOpen: () => void
  apiKey: string
  onApiKeyChange: (key: string) => void
}

export function AppHeader({
  isDarkMode,
  toggleTheme,
  isFullscreen,
  toggleFullscreen,
  activePanel,
  setActivePanel,
  isMobile,
  onCopyMarkdown,
  onDownloadMarkdown,
  onDocumentationOpen,
  apiKey,
  onApiKeyChange
}: AppHeaderProps) {
  return (
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
              onClick={onCopyMarkdown}
              className="h-8"
            >
              <Copy className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onDownloadMarkdown}
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
              onClick={onDocumentationOpen}
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
              onApiKeyChange={onApiKeyChange}
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
  )
}