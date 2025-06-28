import React from 'react'
import { 
  FileText, 
  Clock, 
  Target, 
  Zap,
  Sparkles,
  Activity
} from 'lucide-react'

interface StatusBarProps {
  markdown: string
  isDarkMode: boolean
  autoComplete?: {
    isEnabled: boolean
    isLoading: boolean
    lastActivity?: string
  }
}

const StatusBar: React.FC<StatusBarProps> = ({ markdown, isDarkMode, autoComplete }) => {
  const getStats = () => {
    const characters = markdown.length
    const charactersNoSpaces = markdown.replace(/\s/g, '').length
    const words = markdown.trim() ? markdown.trim().split(/\s+/).length : 0
    const lines = markdown.split('\n').length
    const paragraphs = markdown.split(/\n\s*\n/).filter(p => p.trim()).length
    
    // Reading time calculation (average 200 words per minute)
    const readingTime = Math.ceil(words / 200)
    
    return {
      characters,
      charactersNoSpaces,
      words,
      lines,
      paragraphs,
      readingTime
    }
  }

  const stats = getStats()

  const getMarkdownElements = () => {
    const headers = (markdown.match(/^#{1,6}\s/gm) || []).length
    const codeBlocks = (markdown.match(/```[\s\S]*?```/g) || []).length
    const links = (markdown.match(/\[.*?\]\(.*?\)/g) || []).length
    const images = (markdown.match(/!\[.*?\]\(.*?\)/g) || []).length
    const lists = (markdown.match(/^[\s]*[-*+]\s|^[\s]*\d+\.\s/gm) || []).length
    const blockquotes = (markdown.match(/^>\s/gm) || []).length
    
    return {
      headers,
      codeBlocks,
      links,
      images,
      lists,
      blockquotes
    }
  }

  const elements = getMarkdownElements()

  return (
    <footer className={`border-t backdrop-blur-sm transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-gray-900/80 border-gray-700' 
        : 'bg-white/80 border-gray-200'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-10 text-xs">
          {/* Left side - Document stats */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <FileText className="w-3 h-3" />
              <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                {stats.words} words
              </span>
            </div>
            
            <div className="flex items-center space-x-1">
              <Target className="w-3 h-3" />
              <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                {stats.characters} chars
              </span>
            </div>
            
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                {stats.readingTime} min read
              </span>
            </div>

            <div className="hidden sm:flex items-center space-x-1">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                {stats.lines} lines • {stats.paragraphs} paragraphs
              </span>
            </div>
          </div>

          {/* Center - Markdown elements */}
          <div className="hidden md:flex items-center space-x-3">
            {elements.headers > 0 && (
              <span className={`px-2 py-1 rounded text-xs ${
                isDarkMode 
                  ? 'bg-blue-500/20 text-blue-400' 
                  : 'bg-blue-100 text-blue-600'
              }`}>
                H: {elements.headers}
              </span>
            )}
            {elements.codeBlocks > 0 && (
              <span className={`px-2 py-1 rounded text-xs ${
                isDarkMode 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-green-100 text-green-600'
              }`}>
                Code: {elements.codeBlocks}
              </span>
            )}
            {elements.links > 0 && (
              <span className={`px-2 py-1 rounded text-xs ${
                isDarkMode 
                  ? 'bg-purple-500/20 text-purple-400' 
                  : 'bg-purple-100 text-purple-600'
              }`}>
                Links: {elements.links}
              </span>
            )}
            {elements.images > 0 && (
              <span className={`px-2 py-1 rounded text-xs ${
                isDarkMode 
                  ? 'bg-yellow-500/20 text-yellow-400' 
                  : 'bg-yellow-100 text-yellow-600'
              }`}>
                Images: {elements.images}
              </span>
            )}
          </div>

          {/* Right side - Status indicators */}
          <div className="flex items-center space-x-3">
            {/* AutoComplete Status */}
            <div className="flex items-center space-x-1">
              <Sparkles className={`w-3 h-3 transition-all duration-200 ${
                autoComplete?.isEnabled
                  ? autoComplete.isLoading
                    ? 'animate-pulse text-blue-400'
                    : isDarkMode ? 'text-gray-200' : 'text-gray-700'
                  : isDarkMode ? 'text-gray-600' : 'text-gray-400'
              }`} />
              <span className={`text-xs ${
                autoComplete?.isEnabled
                  ? isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  : isDarkMode ? 'text-gray-500' : 'text-gray-400'
              }`}>
                {autoComplete?.isEnabled ? 'AutoComplete' : 'AC Off'}
              </span>
            </div>

            {/* Activity Log */}
            <div className="flex items-center space-x-1">
              <Activity className={`w-3 h-3 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <span className={`text-xs ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {autoComplete?.lastActivity || 'Ready'}
              </span>
            </div>

            <div className="flex items-center space-x-1">
              <Zap className={`w-3 h-3 ${
                isDarkMode ? 'text-yellow-400' : 'text-yellow-500'
              }`} />
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                Live
              </span>
            </div>

            <span className={`text-xs ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default StatusBar
