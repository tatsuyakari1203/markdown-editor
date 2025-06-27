import React, { useRef, useState, useCallback, useEffect } from 'react'
import { 
  Search, 
  RotateCcw, 
  RotateCw, 
  Clipboard,
  Bold,
  Italic,
  Code,
  List,
  ListOrdered,
  Quote,
  Link,
  Image,
  Table,
  MoreHorizontal
} from 'lucide-react'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import TableGenerator from './ui/TableGenerator';
import { useClipboardReader } from '../hooks/useClipboardReader'
import { useResponsive } from '../hooks/use-mobile'
import { normalizeTableContent } from '@/lib/table-normalizer'
import Editor from '@monaco-editor/react'
import type { editor } from 'monaco-editor'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  isDarkMode: boolean
  editorRef?: React.MutableRefObject<editor.IStandaloneCodeEditor | null>
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ value, onChange, isDarkMode, editorRef: externalEditorRef }) => {
  const internalEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const editorRef = externalEditorRef || internalEditorRef
  const [showFind, setShowFind] = useState(false)
  const [findText, setFindText] = useState('')
  const [lineNumbers, setLineNumbers] = useState(true)
  const { readClipboard, isLoading } = useClipboardReader()
  const { isMobile } = useResponsive()

  const handleEditorDidMount = useCallback((editor: editor.IStandaloneCodeEditor, monaco: typeof import('monaco-editor')) => {
    editorRef.current = editor
    
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
    
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => setShowFind(true))
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyV, () => handlePasteFromClipboard())
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, () => toggleMarkdownFormatting('**', '**', 'bold text'))
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI, () => toggleMarkdownFormatting('*', '*', 'italic text'))
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Backquote, () => toggleMarkdownFormatting('`', '`', 'code'))

  }, [lineNumbers])

  const handleEditorChange = useCallback((newValue: string | undefined) => {
    if (newValue !== undefined) {
      onChange(newValue)
    }
  }, [onChange])

  const toggleMarkdownFormatting = (before: string, after: string, placeholder: string) => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const model = editor.getModel();
    if (!model) return;

    const selection = editor.getSelection();
    if (!selection) return;

    const selectedText = model.getValueInRange(selection);

    if (selectedText) {
      const surroundingTextSelection = {
        startLineNumber: selection.startLineNumber,
        startColumn: Math.max(1, selection.startColumn - before.length),
        endLineNumber: selection.endLineNumber,
        endColumn: selection.endColumn + after.length
      };

      const surroundingText = model.getValueInRange(surroundingTextSelection);

      if (surroundingText.startsWith(before) && surroundingText.endsWith(after)) {
        // Unwrap
        const newText = selectedText;
        editor.executeEdits('toolbar', [{
          range: surroundingTextSelection,
          text: newText
        }]);
      } else {
        // Wrap
        const newText = before + selectedText + after;
        editor.executeEdits('toolbar', [{
          range: selection,
          text: newText
        }]);
      }
    } else {
      // Insert placeholder
      const newText = before + placeholder + after;
      editor.executeEdits('toolbar', [{
        range: selection,
        text: newText
      }]);

      setTimeout(() => {
        const newPosition = editor.getPosition();
        if (newPosition) {
          editor.setSelection({
            startLineNumber: newPosition.lineNumber,
            startColumn: newPosition.column - after.length - placeholder.length,
            endLineNumber: newPosition.lineNumber,
            endColumn: newPosition.column - after.length
          });
        }
      }, 0);
    }
  };

  const insertText = (before: string, after: string = '', placeholder: string = '') => {
    if (!editorRef.current) return

    const editor = editorRef.current
    const selection = editor.getSelection()
    if (!selection) return

    const selectedText = editor.getModel()?.getValueInRange(selection) || ''
    const textToInsert = selectedText || placeholder

    const operation = {
      range: selection,
      text: before + textToInsert + after,
      forceMoveMarkers: true
    }
    
    editor.executeEdits('toolbar', [operation])
    
    setTimeout(() => {
        editor.focus()
        const newPosition = editor.getPosition()
        if (newPosition && !selectedText) {
            const newSelection = {
                selectionStartLineNumber: newPosition.lineNumber,
                selectionStartColumn: newPosition.column - after.length,
                positionLineNumber: newPosition.lineNumber,
                positionColumn: newPosition.column - after.length,
            };
            editor.setSelection(newSelection);
        }
    }, 0)
  }

  const undo = useCallback(() => editorRef.current?.trigger('keyboard', 'undo', null), [])
  const redo = useCallback(() => editorRef.current?.trigger('keyboard', 'redo', null), [])

  const findNext = useCallback(() => {
    if (!findText || !editorRef.current) return
    const findController = editorRef.current.getContribution('editor.contrib.findController')
    if (findController) {
      (findController as any).start({
        searchString: findText,
        replaceString: '',
        isReplaceRevealed: false,
        isRegex: false,
        wholeWord: false,
        matchCase: false
      })
    }
  }, [findText])

  useEffect(() => {
    editorRef.current?.updateOptions({ lineNumbers: lineNumbers ? 'on' : 'off' })
  }, [lineNumbers])

  const handlePasteFromClipboard = useCallback(async () => {
    if (!editorRef.current) return
    try {
      const result = await readClipboard()
      if (result.success && result.markdown) {
        const editor = editorRef.current
        const selection = editor.getSelection()
        if (selection) {
          const normalizedMarkdown = normalizeTableContent(result.markdown)
          editor.executeEdits('paste-from-clipboard', [{
            range: selection,
            text: normalizedMarkdown
          }])
        }
      }
    } catch (error) {
      console.error('Failed to paste from clipboard:', error)
    }
  }, [readClipboard])

  const toolbarItems = [
    { icon: Bold, action: () => toggleMarkdownFormatting('**', '**', 'bold text'), label: 'Bold' },
    { icon: Italic, action: () => toggleMarkdownFormatting('*', '*', 'italic text'), label: 'Italic' },
    { icon: Code, action: () => toggleMarkdownFormatting('`', '`', 'code'), label: 'Code' },
    { icon: Quote, action: () => insertText('> ', '', 'quote'), label: 'Quote' },
    { icon: List, action: () => insertText('- ', '', 'list item'), label: 'List' },
    { icon: ListOrdered, action: () => insertText('1. ', '', 'list item'), label: 'Ordered List' },
    { icon: Link, action: () => toggleMarkdownFormatting('[', '](url)', 'link text'), label: 'Link' },
    { icon: Image, action: () => insertText('![', '](url)', 'alt text'), label: 'Image' },
  ]

  const insertTable = (rows: number, cols: number) => {
    let table = '\n';
    // Header
    table += `| ${Array.from({ length: cols }).map((_, i) => `Header ${i + 1}`).join(' | ')} |\n`;
    // Separator
    table += `| ${Array.from({ length: cols }).map(() => '----------').join(' | ')} |\n`;
    // Body
    for (let i = 0; i < rows; i++) {
      table += `| ${Array.from({ length: cols }).map(() => 'Cell').join(' | ')} |\n`;
    }

    insertText(table);
  };

  const renderToolbar = () => {
    const primaryItems = isMobile ? toolbarItems.slice(0, 4) : toolbarItems
    const secondaryItems = isMobile ? toolbarItems.slice(4) : []

    return (
      <div className="flex items-center space-x-1">
        {primaryItems.map((item, index) => (
          <Button
            key={index}
            variant="ghost"
            size="sm"
            onClick={item.action}
            className={`h-8 px-2 ${isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
            title={item.label}
          >
            <item.icon className="w-4 h-4" />
          </Button>
        ))}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 px-2 ${isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
              title="Table"
            >
              <Table className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <TableGenerator onSelect={insertTable} isDarkMode={isDarkMode} />
          </PopoverContent>
        </Popover>
        {isMobile && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}>
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
              {secondaryItems.map((item, index) => (
                <DropdownMenuItem key={index} onClick={item.action} className={`cursor-pointer ${isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-900'}`}>
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    )
  }

  return (
    <div className={`h-full flex flex-col transition-colors duration-300 overflow-hidden relative ${isDarkMode ? 'bg-gray-800/50' : 'bg-white'}`}>
      {showFind && (
        <div className={`absolute top-4 right-4 z-10 p-3 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'}`}>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              placeholder="Find..."
              className={`px-2 py-1 text-sm border rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
              onKeyDown={(e) => e.key === 'Enter' ? findNext() : e.key === 'Escape' && setShowFind(false)}
              autoFocus
            />
            <Button size="sm" onClick={findNext}><Search className="w-3 h-3" /></Button>
            <Button size="sm" variant="ghost" onClick={() => setShowFind(false)}>×</Button>
          </div>
        </div>
      )}

      <div className={`flex items-center justify-between px-4 py-2 border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
        <div className="flex items-center space-x-2">
          {renderToolbar()}
          <Button size="sm" variant="ghost" onClick={undo} title="Undo (Ctrl+Z)"><RotateCcw className="w-3 h-3" /></Button>
          <Button size="sm" variant="ghost" onClick={redo} title="Redo (Ctrl+Y)"><RotateCw className="w-3 h-3" /></Button>
          <Button size="sm" variant="ghost" onClick={() => setShowFind(!showFind)} title="Find (Ctrl+F)"><Search className="w-3 h-3" /></Button>
          <Button size="sm" variant="ghost" onClick={handlePasteFromClipboard} disabled={isLoading} title="Paste from Clipboard (Ctrl+Shift+V)"><Clipboard className="w-3 h-3" /></Button>
        </div>
        <div className="flex items-center space-x-2">
          <label className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <input type="checkbox" checked={lineNumbers} onChange={(e) => setLineNumbers(e.target.checked)} className="mr-1" />
            Line numbers
          </label>
        </div>
      </div>

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
            scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 }
          }}
        />
      </div>
      
      <div className={`px-4 py-2 border-t text-xs flex justify-between transition-colors duration-300 ${isDarkMode ? 'bg-gray-800/50 border-gray-600 text-gray-400' : 'bg-gray-50/50 border-gray-200 text-gray-500'}`}>
        <span>{value.length} characters, {value.split('\n').length} lines</span>
        <span>Markdown | UTF-8 | Monaco Editor</span>
      </div>
    </div>
  )
}

export default MarkdownEditor

