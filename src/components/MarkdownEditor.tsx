import React, { useCallback, useRef, useEffect, useState } from 'react'
import { Search, RotateCcw, RotateCw, Clipboard } from 'lucide-react'
import { Button } from './ui/button'
import { useClipboardReader } from '../hooks/useClipboardReader'
import { isTableLine, estimateTableRowVisualLines, normalizeTableContent } from '@/lib/table-normalizer'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  isDarkMode: boolean
}

interface HistoryState {
  content: string
  cursor: number
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ value, onChange, isDarkMode }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)
  const [history, setHistory] = useState<HistoryState[]>([{ content: value, cursor: 0 }])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [showFind, setShowFind] = useState(false)
  const [findText, setFindText] = useState('')
  const [lineNumbers, setLineNumbers] = useState(true)
  const { readClipboard, isLoading } = useClipboardReader()

  const addToHistory = useCallback((content: string, cursor: number) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push({ content, cursor })
    if (newHistory.length > 50) { // Limit history size
      newHistory.shift()
    } else {
      setHistoryIndex(newHistory.length - 1)
    }
    setHistory(newHistory)
  }, [history, historyIndex])

  const handleChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = event.target.value
    onChange(newValue)
    
    // Add to history after a delay to avoid too many entries
    const timer = setTimeout(() => {
      addToHistory(newValue, event.target.selectionStart)
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [onChange, addToHistory])

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      const state = history[newIndex]
      setHistoryIndex(newIndex)
      onChange(state.content)
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(state.cursor, state.cursor)
          textareaRef.current.focus()
        }
      }, 0)
    }
  }, [history, historyIndex, onChange])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      const state = history[newIndex]
      setHistoryIndex(newIndex)
      onChange(state.content)
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(state.cursor, state.cursor)
          textareaRef.current.focus()
        }
      }, 0)
    }
  }, [history, historyIndex, onChange])

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = event.currentTarget
    const { selectionStart, selectionEnd } = textarea

    // Handle keyboard shortcuts
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'z':
          if (event.shiftKey) {
            event.preventDefault()
            redo()
          } else {
            event.preventDefault()
            undo()
          }
          return
        case 'y':
          event.preventDefault()
          redo()
          return
        case 'f':
          event.preventDefault()
          setShowFind(!showFind)
          return
        case 'v':
          if (event.shiftKey) {
            event.preventDefault()
            handlePasteFromClipboard()
          }
          return
      }
    }

    // Handle Tab key for indentation
    if (event.key === 'Tab') {
      event.preventDefault()
      
      const beforeCursor = value.substring(0, selectionStart)
      const afterCursor = value.substring(selectionEnd)
      
      if (event.shiftKey) {
        // Shift+Tab: Remove indentation
        const lines = beforeCursor.split('\n')
        const currentLine = lines[lines.length - 1]
        
        if (currentLine.startsWith('  ')) {
          lines[lines.length - 1] = currentLine.substring(2)
          const newValue = lines.join('\n') + afterCursor
          onChange(newValue)
          
          // Update cursor position
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = selectionStart - 2
          }, 0)
        }
      } else {
        // Tab: Add indentation
        const newValue = beforeCursor + '  ' + afterCursor
        onChange(newValue)
        
        // Update cursor position
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + 2
        }, 0)
      }
    }
    
    // Handle Enter key for list continuation
    if (event.key === 'Enter') {
      const beforeCursor = value.substring(0, selectionStart)
      const lines = beforeCursor.split('\n')
      const currentLine = lines[lines.length - 1]
      
      // Check for unordered list
      const unorderedMatch = currentLine.match(/^(\s*)-\s/)
      if (unorderedMatch) {
        event.preventDefault()
        const indent = unorderedMatch[1]
        const newValue = value.substring(0, selectionStart) + '\n' + indent + '- ' + value.substring(selectionEnd)
        onChange(newValue)
        
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + indent.length + 3
        }, 0)
        return
      }
      
      // Check for ordered list
      const orderedMatch = currentLine.match(/^(\s*)(\d+)\.\s/)
      if (orderedMatch) {
        event.preventDefault()
        const indent = orderedMatch[1]
        const nextNumber = parseInt(orderedMatch[2]) + 1
        const newValue = value.substring(0, selectionStart) + '\n' + indent + nextNumber + '. ' + value.substring(selectionEnd)
        onChange(newValue)
        
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + indent.length + nextNumber.toString().length + 3
        }, 0)
        return
      }
    }
  }, [value, onChange, undo, redo, showFind])

  const findNext = useCallback(() => {
    if (!findText || !textareaRef.current) return
    
    const textarea = textareaRef.current
    const text = textarea.value.toLowerCase()
    const searchText = findText.toLowerCase()
    const currentPos = textarea.selectionStart
    const nextIndex = text.indexOf(searchText, currentPos + 1)
    
    if (nextIndex !== -1) {
      textarea.setSelectionRange(nextIndex, nextIndex + findText.length)
      textarea.focus()
    } else {
      // Search from beginning
      const firstIndex = text.indexOf(searchText)
      if (firstIndex !== -1) {
        textarea.setSelectionRange(firstIndex, firstIndex + findText.length)
        textarea.focus()
      }
    }
  }, [findText])

  const getLineNumbers = useCallback(() => {
    const lines = value.split('\n')
    
    if (!textareaRef.current) {
      return lines.map((_, index) => index + 1)
    }
    
    const textarea = textareaRef.current
    const textareaWidth = textarea.clientWidth - 32 // subtract padding
    
    // If we don't have valid dimensions, just show logical line numbers
    if (textareaWidth <= 0) {
      return lines.map((_, index) => index + 1)
    }
    
    const computedStyle = window.getComputedStyle(textarea)
    const fontSize = parseFloat(computedStyle.fontSize)
    const fontFamily = computedStyle.fontFamily
    
    // Create a temporary canvas to measure text width
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    
    if (!context) {
      return lines.map((_, index) => index + 1)
    }
    
    context.font = `${fontSize}px ${fontFamily}`
    
    const visualLines: number[] = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Always show line number for logical lines
      visualLines.push(i + 1)
      
      // Calculate text wrapping for long lines
      if (line.length > 0) {
        const textWidth = context.measureText(line).width
        const wrappedLines = Math.max(1, Math.ceil(textWidth / textareaWidth))
        
        // Add empty line numbers for wrapped lines
        for (let j = 1; j < wrappedLines; j++) {
          visualLines.push(0)
        }
      }
    }
    
    return visualLines
  }, [value])

  // Sync scroll between textarea and line numbers
  useEffect(() => {
    const textarea = textareaRef.current
    const lineNumbersContainer = lineNumbersRef.current
    
    if (!textarea || !lineNumbersContainer) return
    
    const handleScroll = () => {
      lineNumbersContainer.scrollTop = textarea.scrollTop
    }
    
    // Handle resize to update line numbers when container width changes
    const handleResize = () => {
      // Force re-render of line numbers when container resizes
      // This is important for responsive behavior when resizing panels
      if (textareaRef.current) {
        const event = new Event('input', { bubbles: true })
        textareaRef.current.dispatchEvent(event)
      }
    }
    
    const resizeObserver = new ResizeObserver(handleResize)
    
    textarea.addEventListener('scroll', handleScroll)
    resizeObserver.observe(textarea)
    
    return () => {
      textarea.removeEventListener('scroll', handleScroll)
      resizeObserver.disconnect()
    }
  }, [lineNumbers])

  const handlePasteFromClipboard = useCallback(async () => {
    if (!textareaRef.current) return
    
    try {
      const result = await readClipboard()
      if (result.success && result.markdown) {
        const textarea = textareaRef.current
        const { selectionStart, selectionEnd } = textarea
        const beforeCursor = value.substring(0, selectionStart)
        const afterCursor = value.substring(selectionEnd)
        
        // Normalize the pasted markdown content, especially tables
        const normalizedMarkdown = normalizeTableContent(result.markdown)
        const newValue = beforeCursor + normalizedMarkdown + afterCursor
        
        onChange(newValue)
        addToHistory(newValue, selectionStart + normalizedMarkdown.length)
        
        // Set cursor position after inserted content and ensure proper scrolling
        requestAnimationFrame(() => {
          const newPosition = selectionStart + normalizedMarkdown.length
          textarea.setSelectionRange(newPosition, newPosition)
          textarea.focus()
          
          // Ensure the cursor is visible by scrolling to it
          const lineHeight = 24 // 1.5rem in pixels
          const lineNumber = newValue.substring(0, newPosition).split('\n').length
          const scrollTop = Math.max(0, (lineNumber - 5) * lineHeight)
          textarea.scrollTop = scrollTop
        })
      }
    } catch (error) {
      console.error('Failed to paste from clipboard:', error)
    }
  }, [value, onChange, readClipboard, addToHistory])

  return (
    <div className="h-full flex flex-col relative">
      {/* Find Dialog */}
      {showFind && (
        <div className={`absolute top-4 right-4 z-10 p-3 rounded-lg shadow-lg border ${
          isDarkMode 
            ? 'bg-gray-800 border-gray-600' 
            : 'bg-white border-gray-300'
        }`}>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              placeholder="Find..."
              className={`px-2 py-1 text-sm border rounded ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300'
              }`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  findNext()
                } else if (e.key === 'Escape') {
                  setShowFind(false)
                }
              }}
              autoFocus
            />
            <Button size="sm" onClick={findNext}>
              <Search className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowFind(false)}>
              ×
            </Button>
          </div>
        </div>
      )}

      {/* Editor Controls */}
      <div className={`flex items-center justify-between px-4 py-2 border-b ${
        isDarkMode ? 'border-gray-600' : 'border-gray-200'
      }`}>
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={undo}
            disabled={historyIndex <= 0}
            title="Undo (Ctrl+Z)"
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            title="Redo (Ctrl+Y)"
          >
            <RotateCw className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowFind(!showFind)}
            title="Find (Ctrl+F)"
          >
            <Search className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handlePasteFromClipboard}
            disabled={isLoading}
            title="Paste from Clipboard (Ctrl+Shift+V)"
          >
            <Clipboard className="w-3 h-3" />
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <label className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <input
              type="checkbox"
              checked={lineNumbers}
              onChange={(e) => setLineNumbers(e.target.checked)}
              className="mr-1"
            />
            Line numbers
          </label>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex relative">
        {/* Line Numbers */}
        {lineNumbers && (
          <div 
            ref={lineNumbersRef}
            className={`w-12 py-4 pb-16 text-right text-xs font-mono border-r overflow-hidden ${
              isDarkMode 
                ? 'bg-gray-800/50 text-gray-500 border-gray-600' 
                : 'bg-gray-50 text-gray-400 border-gray-200'
            }`}
            style={{
              overflowY: 'hidden',
              lineHeight: '1.5rem'
            }}
          >
            {getLineNumbers().map((num, index) => (
              <div key={index} className="px-2 flex items-center justify-end whitespace-nowrap" style={{ height: '1.5rem' }}>
                {num > 0 ? num : ''}
              </div>
            ))}
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className={`flex-1 p-4 pb-16 border-0 resize-none focus:ring-0 focus:outline-none font-mono text-sm leading-relaxed transition-colors duration-300 overflow-auto ${
            isDarkMode 
              ? 'bg-transparent text-gray-100 placeholder-gray-500' 
              : 'bg-transparent text-gray-900 placeholder-gray-400'
          }`}
          style={{ 
            lineHeight: '1.5rem'
          }}
          placeholder="Start typing your Markdown here..."
          spellCheck={false}
        />
      </div>
      
      {/* Editor Status */}
      <div className={`px-4 py-2 border-t text-xs flex justify-between transition-colors duration-300 ${
        isDarkMode 
          ? 'bg-gray-800/50 border-gray-600 text-gray-400' 
          : 'bg-gray-50/50 border-gray-200 text-gray-500'
      }`}>
        <span>
          {value.length} characters, {value.split('\n').length} lines
        </span>
        <span>
          Markdown | UTF-8 | {historyIndex + 1}/{history.length}
        </span>
      </div>
    </div>
  )
}

export default MarkdownEditor
