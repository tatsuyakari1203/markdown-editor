import React, { useRef, useState, useCallback, useEffect } from 'react'
import { Search, RotateCcw, RotateCw, Clipboard } from 'lucide-react'
import { Button } from './ui/button'
import { useClipboardReader } from '../hooks/useClipboardReader'
import { normalizeTableContent } from '@/lib/table-normalizer'
import Editor from '@monaco-editor/react'
import type { editor } from 'monaco-editor'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  isDarkMode: boolean
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ value, onChange, isDarkMode }) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const [showFind, setShowFind] = useState(false)
  const [findText, setFindText] = useState('')
  const [lineNumbers, setLineNumbers] = useState(true)
  const { readClipboard, isLoading } = useClipboardReader()

  const handleEditorDidMount = useCallback((editor: editor.IStandaloneCodeEditor, monaco: typeof import('monaco-editor')) => {
    editorRef.current = editor
    
    // Configure editor options
    editor.updateOptions({
      wordWrap: 'on',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 14,
      lineHeight: 24,
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
      renderLineHighlight: 'none',
      hideCursorInOverviewRuler: true,
      overviewRulerBorder: false,
      lineNumbers: lineNumbers ? 'on' : 'off'
    })
    
    // Add custom keybindings
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
      setShowFind(true)
    })
    
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyV, () => {
      handlePasteFromClipboard()
    })
  }, [lineNumbers])

  const handleEditorChange = useCallback((newValue: string | undefined) => {
    if (newValue !== undefined) {
      onChange(newValue)
    }
  }, [onChange])

  const undo = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.trigger('keyboard', 'undo', null)
    }
  }, [])

  const redo = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.trigger('keyboard', 'redo', null)
    }
  }, [])

  // Monaco Editor handles most keyboard shortcuts automatically

  const findNext = useCallback(() => {
    if (!findText || !editorRef.current) return
    
    const editor = editorRef.current
    editor.getAction('actions.find')?.run()
    
    // Set the search text
    const findController = editor.getContribution('editor.contrib.findController')
    if (findController) {
      findController.start({
        searchString: findText,
        replaceString: '',
        isReplaceRevealed: false,
        isRegex: false,
        wholeWord: false,
        matchCase: false
      })
    }
  }, [findText])

  // Update line numbers when setting changes
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        lineNumbers: lineNumbers ? 'on' : 'off'
      })
    }
  }, [lineNumbers])

  const handlePasteFromClipboard = useCallback(async () => {
    if (!editorRef.current) return
    
    try {
      const result = await readClipboard()
      if (result.success && result.markdown) {
        const editor = editorRef.current
        const selection = editor.getSelection()
        
        if (selection) {
          // Normalize the pasted markdown content, especially tables
          const normalizedMarkdown = normalizeTableContent(result.markdown)
          
          // Insert the normalized markdown at the current cursor position
          editor.executeEdits('paste-from-clipboard', [{
            range: selection,
            text: normalizedMarkdown
          }])
          
          // Set cursor position after inserted content
          const newPosition = {
            lineNumber: selection.startLineNumber,
            column: selection.startColumn + normalizedMarkdown.length
          }
          editor.setPosition(newPosition)
          editor.focus()
        }
      }
    } catch (error) {
      console.error('Failed to paste from clipboard:', error)
    }
  }, [readClipboard])

  return (
    <div className={`h-full flex flex-col transition-colors duration-300 overflow-hidden relative ${
      isDarkMode ? 'bg-gray-800/50' : 'bg-white'
    }`}>
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
            title="Undo (Ctrl+Z)"
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={redo}
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

      {/* Monaco Editor */}
      <div className="flex-1 relative overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="markdown"
          value={value}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          theme={isDarkMode ? 'vs-dark' : 'vs'}
          options={{
            wordWrap: 'on',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            lineHeight: 24,
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
            renderLineHighlight: 'none',
            hideCursorInOverviewRuler: true,
            overviewRulerBorder: false,
            lineNumbers: lineNumbers ? 'on' : 'off',
            automaticLayout: true,
            padding: { top: 16, bottom: 64 },
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8
            }
          }}
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
          Markdown | UTF-8 | Monaco Editor
        </span>
      </div>
    </div>
  )
}

export default MarkdownEditor
