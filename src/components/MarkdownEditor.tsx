import React, { useRef, useState, useCallback, useEffect } from 'react'
import { 
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
  MoreHorizontal,
  HelpCircle,
  Loader2
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
import AIToolbar from './AIToolbar';
import { useToast } from '../hooks/use-toast'
import { useClipboardReader } from '../hooks/useClipboardReader'
import { useResponsive } from '../hooks/use-mobile'
import { normalizeTableContent } from '@/lib/table-normalizer'
import Editor from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import * as monaco from 'monaco-editor'
import DocumentationModal from './DocumentationModal'
import geminiService from '../services/geminiService'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  isDarkMode: boolean
  editorRef?: React.MutableRefObject<editor.IStandaloneCodeEditor | null>
  apiKey?: string
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ value, onChange, isDarkMode, editorRef: externalEditorRef, apiKey = '' }) => {
  const internalEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const editorRef = externalEditorRef || internalEditorRef

  const [lineNumbers, setLineNumbers] = useState(true)
  const [isDocsOpen, setIsDocsOpen] = useState(false)
  const [isRewriteInputOpen, setIsRewriteInputOpen] = useState(false)
  const [rewritePrompt, setRewritePrompt] = useState('')
  const [isRewriting, setIsRewriting] = useState(false)
  const { readClipboard, isLoading } = useClipboardReader()
  const { isMobile } = useResponsive()
  const { toast } = useToast()

  const getSelectedText = (): { text: string; selection: any } | null => {
    const editor = editorRef.current;
    if (!editor) return null;

    const selection = editor.getSelection();
    if (!selection) return null;

    const selectedText = editor.getModel()?.getValueInRange(selection) || '';
    return { text: selectedText, selection };
  };

  const replaceText = (selection: any, newText: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.executeEdits('ai-toolbar', [{
      range: selection,
      text: newText,
      forceMoveMarkers: true
    }]);

    editor.focus();
  };

  const handleRewrite = async () => {
    if (!rewritePrompt.trim()) return;
    
    const selectedData = getSelectedText();
    if (!selectedData || !selectedData.text.trim()) {
      toast({
        title: 'Error',
        description: 'Please select text to rewrite.',
        variant: 'destructive',
      });
      return;
    }

    if (!apiKey) {
      toast({
        title: 'Missing API Key',
        description: 'Please configure your Gemini API key in Settings.',
        variant: 'destructive',
      });
      return;
    }

    setIsRewriting(true);
    try {
      const rewrittenText = await geminiService.rewriteText(selectedData.text, rewritePrompt, apiKey);
      replaceText(selectedData.selection, rewrittenText);
      setRewritePrompt('');
      setIsRewriteInputOpen(false);
      toast({
          title: 'Success',
          description: 'Text has been rewritten successfully!'
        });
    } catch (error) {
      console.error('Rewrite error:', error);
      toast({
          title: 'Error',
          description: 'Unable to rewrite text. Please try again.',
          variant: 'destructive',
        });
    } finally {
      setIsRewriting(false);
    }
  };

  const handleRewriteInputToggle = (isOpen: boolean) => {
    setIsRewriteInputOpen(isOpen);
    if (!isOpen) {
      setRewritePrompt('');
    }
  };

  const handleEditorDidMount = useCallback((editor: editor.IStandaloneCodeEditor, monaco: typeof import('monaco-editor')) => {
    editorRef.current = editor
    
    editor.updateOptions({
      wordWrap: 'on',
      // Advanced editor features
      minimap: { 
        enabled: true,
        side: 'right',
        showSlider: 'mouseover',
        renderCharacters: true,
        maxColumn: 120
      },
      scrollBeyondLastLine: false,
      fontSize: 14,
      lineHeight: 24,
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
      renderLineHighlight: 'line',
      hideCursorInOverviewRuler: false,
      overviewRulerBorder: true,
      lineNumbers: lineNumbers ? 'on' : 'off',
      // Code folding
      folding: true,
      foldingStrategy: 'indentation',
      showFoldingControls: 'mouseover',
      foldingHighlight: true,
      // Multiple cursors
      multiCursorModifier: 'ctrlCmd',
      multiCursorMergeOverlapping: true,
      // Enhanced find/replace
      find: {
        seedSearchStringFromSelection: 'selection',
        autoFindInSelection: 'multiline'
      },
      // Enhanced autocomplete settings
      suggestOnTriggerCharacters: true,
      acceptSuggestionOnCommitCharacter: true,
      acceptSuggestionOnEnter: 'on',
      quickSuggestions: {
        other: true,
        comments: true,
        strings: true
      },
      // Additional productivity features
      bracketPairColorization: {
        enabled: true
      },
      guides: {
        bracketPairs: true,
        indentation: true
      },
      renderWhitespace: 'selection',
      smoothScrolling: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on'
    })
    
    // Enhanced Markdown language configuration
    monaco.languages.setLanguageConfiguration('markdown', {
      comments: {
        blockComment: ['<!--', '-->']
      },
      brackets: [
        ['[', ']'],
        ['(', ')'],
        ['{', '}']
      ],
      autoClosingPairs: [
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '{', close: '}' },
        { open: '`', close: '`' },
        { open: '**', close: '**' },
        { open: '*', close: '*' },
        { open: '_', close: '_' },
        { open: '__', close: '__' }
      ],
      surroundingPairs: [
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '{', close: '}' },
        { open: '`', close: '`' },
        { open: '**', close: '**' },
        { open: '*', close: '*' },
        { open: '_', close: '_' },
        { open: '__', close: '__' },
        { open: '"', close: '"' },
        { open: "'", close: "'" }
      ],
      folding: {
        markers: {
          start: new RegExp('^\\s*<!--\\s*#region\\b.*-->'),
          end: new RegExp('^\\s*<!--\\s*#endregion\\b.*-->')
        }
      }
    })

    // Enhanced syntax highlighting for Markdown
    monaco.languages.setMonarchTokensProvider('markdown', {
      tokenizer: {
        root: [
          // Headers
          [/^(#{1,6})\s.*$/, 'markup.heading'],
          
          // Code blocks
          [/^```.*$/, { token: 'string.code', next: '@codeblock' }],
          
          // Inline code
          [/`[^`]*`/, 'string.code'],
          
          // Bold
          [/\*\*([^*]|\*(?!\*))*\*\*/, 'markup.bold'],
          [/__([^_]|_(?!_))*__/, 'markup.bold'],
          
          // Italic
          [/\*([^*]|\*\*)*\*/, 'markup.italic'],
          [/_([^_]|__)*_/, 'markup.italic'],
          
          // Links
          [/\[([^\]]+)\]\(([^)]+)\)/, ['markup.link', 'markup.link.url']],
          
          // Images
          [/!\[([^\]]*)\]\(([^)]+)\)/, ['markup.link', 'markup.link.url']],
          
          // Lists
          [/^\s*[-*+]\s/, 'markup.list'],
          [/^\s*\d+\.\s/, 'markup.list'],
          
          // Checkboxes
          [/^\s*[-*+]\s*\[[ x]\]\s/, 'markup.list.checkbox'],
          
          // Blockquotes
          [/^>.*$/, 'markup.quote'],
          
          // Horizontal rules
          [/^\s*[-*_]{3,}\s*$/, 'markup.hr'],
          
          // Tables
          [/\|/, 'markup.table'],
          
          // HTML tags
          [/<[^>]+>/, 'markup.tag'],
          
          // Strikethrough
          [/~~[^~]*~~/, 'markup.strikethrough']
        ],
        
        codeblock: [
          [/^```$/, { token: 'string.code', next: '@pop' }],
          [/.*$/, 'string.code']
        ]
      }
    })

    // Register Markdown completion provider
    const completionProvider = monaco.languages.registerCompletionItemProvider('markdown', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        }

        const suggestions = [
          // Table snippets
          {
            label: 'table3x3',
            kind: monaco.languages.CompletionItemKind.Snippet,
            documentation: 'Insert a 3x3 table',
            insertText: '| Header 1 | Header 2 | Header 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n| Cell 4   | Cell 5   | Cell 6   |',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range
          },
          {
            label: 'table2x2',
            kind: monaco.languages.CompletionItemKind.Snippet,
            documentation: 'Insert a 2x2 table',
            insertText: '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range
          },
          // Code block snippets
          {
            label: 'codeblock',
            kind: monaco.languages.CompletionItemKind.Snippet,
            documentation: 'Insert a code block',
            insertText: '```${1:language}\n${2:code}\n```',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range
          },
          {
            label: 'codejs',
            kind: monaco.languages.CompletionItemKind.Snippet,
            documentation: 'Insert a JavaScript code block',
            insertText: '```javascript\n${1:// Your JavaScript code here}\n```',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range
          },
          {
            label: 'codepy',
            kind: monaco.languages.CompletionItemKind.Snippet,
            documentation: 'Insert a Python code block',
            insertText: '```python\n${1:# Your Python code here}\n```',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range
          },
          // Link and image snippets
          {
            label: 'link',
            kind: monaco.languages.CompletionItemKind.Snippet,
            documentation: 'Insert a link',
            insertText: '[${1:link text}](${2:url})',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range
          },
          {
            label: 'image',
            kind: monaco.languages.CompletionItemKind.Snippet,
            documentation: 'Insert an image',
            insertText: '![${1:alt text}](${2:image url})',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range
          },
          // List snippets
          {
            label: 'checklist',
            kind: monaco.languages.CompletionItemKind.Snippet,
            documentation: 'Insert a checklist',
            insertText: '- [ ] ${1:Task 1}\n- [ ] ${2:Task 2}\n- [ ] ${3:Task 3}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range
          },
          // Header snippets
          {
            label: 'h1',
            kind: monaco.languages.CompletionItemKind.Snippet,
            documentation: 'Insert H1 header',
            insertText: '# ${1:Header}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range
          },
          {
            label: 'h2',
            kind: monaco.languages.CompletionItemKind.Snippet,
            documentation: 'Insert H2 header',
            insertText: '## ${1:Header}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range
          },
          {
            label: 'h3',
            kind: monaco.languages.CompletionItemKind.Snippet,
            documentation: 'Insert H3 header',
            insertText: '### ${1:Header}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range
          },
          // Quote and callout snippets
          {
            label: 'quote',
            kind: monaco.languages.CompletionItemKind.Snippet,
            documentation: 'Insert a blockquote',
            insertText: '> ${1:Quote text}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range
          },
          {
            label: 'callout',
            kind: monaco.languages.CompletionItemKind.Snippet,
            documentation: 'Insert a callout box',
            insertText: '> **${1:Note}**: ${2:Important information}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range
          }
        ]

        return { suggestions }
      }
    })
    
    // Use Monaco Editor's default find widget
    editor.addAction({
      id: 'find',
      label: 'Find',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF],
      run: () => {
        editor.getAction('actions.find')?.run()
      }
    })
    
    // Documentation shortcut
    editor.addAction({
      id: 'show-documentation',
      label: 'Show Documentation',
      keybindings: [monaco.KeyCode.F1, monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyH],
      run: () => {
        setIsDocsOpen(true)
      }
    })
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyV, () => handlePasteFromClipboard())
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, () => toggleMarkdownFormatting('**', '**', 'bold text'))
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI, () => toggleMarkdownFormatting('*', '*', 'italic text'))
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Backquote, () => toggleMarkdownFormatting('`', '`', 'code'))

    // Markdown validation and linting
    const diagnosticsProvider = monaco.languages.registerCodeActionProvider('markdown', {
      provideCodeActions: (model, range, context) => {
        const actions: monaco.languages.CodeAction[] = []
        
        context.markers.forEach(marker => {
          if (marker.message.includes('broken-link')) {
            actions.push({
              title: 'Fix broken link',
              kind: 'quickfix',
              edit: {
                edits: [{
                  resource: model.uri,
                  versionId: model.getVersionId(),
                  textEdit: {
                    range: marker,
                    text: '[link text](https://example.com)'
                  }
                }]
              }
            })
          }
        })
        
        return {
          actions,
          dispose: () => {}
        }
      }
    })

    // Real-time Markdown validation
    const validateMarkdown = (model: monaco.editor.ITextModel) => {
      const text = model.getValue()
      const lines = text.split('\n')
      const markers: monaco.editor.IMarkerData[] = []

      lines.forEach((line, lineIndex) => {
        const lineNumber = lineIndex + 1
        
        // Check for broken links
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
        let linkMatch
        while ((linkMatch = linkRegex.exec(line)) !== null) {
          const url = linkMatch[2]
          if (!url || url.trim() === '' || url === 'url') {
            markers.push({
              severity: monaco.MarkerSeverity.Warning,
              startLineNumber: lineNumber,
              startColumn: linkMatch.index + 1,
              endLineNumber: lineNumber,
              endColumn: linkMatch.index + linkMatch[0].length + 1,
              message: 'Broken or empty link URL',
              code: 'broken-link'
            })
          }
        }
        
        // Check for malformed tables
        if (line.includes('|')) {
          const cells = line.split('|').filter(cell => cell.trim() !== '')
          if (cells.length > 0 && lineIndex > 0) {
            const prevLine = lines[lineIndex - 1]
            if (prevLine.includes('|')) {
              const prevCells = prevLine.split('|').filter(cell => cell.trim() !== '')
              if (cells.length !== prevCells.length && !prevLine.includes('---')) {
                markers.push({
                  severity: monaco.MarkerSeverity.Info,
                  startLineNumber: lineNumber,
                  startColumn: 1,
                  endLineNumber: lineNumber,
                  endColumn: line.length + 1,
                  message: 'Table row has different number of columns',
                  code: 'table-inconsistent'
                })
              }
            }
          }
        }
        
        // Check for missing alt text in images
        const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
        let imageMatch
        while ((imageMatch = imageRegex.exec(line)) !== null) {
          const altText = imageMatch[1]
          if (!altText || altText.trim() === '') {
            markers.push({
              severity: monaco.MarkerSeverity.Info,
              startLineNumber: lineNumber,
              startColumn: imageMatch.index + 1,
              endLineNumber: lineNumber,
              endColumn: imageMatch.index + imageMatch[0].length + 1,
              message: 'Image missing alt text for accessibility',
              code: 'missing-alt-text'
            })
          }
        }
        
        // Check for consecutive headers without content
        if (line.match(/^#{1,6}\s/)) {
          const nextLine = lines[lineIndex + 1]
          if (nextLine && nextLine.match(/^#{1,6}\s/)) {
            markers.push({
              severity: monaco.MarkerSeverity.Info,
              startLineNumber: lineNumber,
              startColumn: 1,
              endLineNumber: lineNumber,
              endColumn: line.length + 1,
              message: 'Consider adding content between headers',
              code: 'empty-section'
            })
          }
        }
      })

      monaco.editor.setModelMarkers(model, 'markdown-lint', markers)
    }

    // Set up real-time validation
    const model = editor.getModel()
    if (model) {
      validateMarkdown(model)
      const disposable = model.onDidChangeContent(() => {
        validateMarkdown(model)
      })
    }

    // Add command palette actions
    editor.addAction({
      id: 'markdown.toggleMinimap',
      label: 'Toggle Minimap',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyM],
      run: () => {
        const currentOptions = editor.getOptions()
        const minimapEnabled = currentOptions.get(monaco.editor.EditorOption.minimap).enabled
        editor.updateOptions({
          minimap: { enabled: !minimapEnabled }
        })
      }
    })

    editor.addAction({
      id: 'markdown.toggleWordWrap',
      label: 'Toggle Word Wrap',
      keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.KeyZ],
      run: () => {
        const currentOptions = editor.getOptions()
        const wordWrap = currentOptions.get(monaco.editor.EditorOption.wordWrap)
        editor.updateOptions({
          wordWrap: wordWrap === 'on' ? 'off' : 'on'
        })
      }
    })

    editor.addAction({
      id: 'markdown.insertCurrentDate',
      label: 'Insert Current Date',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyD],
      run: () => {
        const date = new Date().toISOString().split('T')[0]
        const selection = editor.getSelection()
        if (selection) {
          editor.executeEdits('insert-date', [{
            range: selection,
            text: date
          }])
        }
      }
    })

    // Cleanup function to dispose providers
    return () => {
      completionProvider.dispose()
      diagnosticsProvider.dispose()
    }
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


      <div className={`flex items-center justify-between px-4 py-2 border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
        <div className="flex items-center space-x-2">
          {renderToolbar()}
          
          {/* AI Toolbar */}
          <AIToolbar 
            editorRef={editorRef}
            isDarkMode={isDarkMode}
            apiKey={apiKey}
            onRewriteInputToggle={handleRewriteInputToggle}
          />
          
          <Button size="sm" variant="ghost" onClick={undo} title="Undo (Ctrl+Z)"><RotateCcw className="w-3 h-3" /></Button>
          <Button size="sm" variant="ghost" onClick={redo} title="Redo (Ctrl+Y)"><RotateCw className="w-3 h-3" /></Button>

          <Button size="sm" variant="ghost" onClick={handlePasteFromClipboard} disabled={isLoading} title="Paste from Clipboard (Ctrl+Shift+V)"><Clipboard className="w-3 h-3" /></Button>
          <Button size="sm" variant="ghost" onClick={() => setIsDocsOpen(true)} title="Documentation (F1)"><HelpCircle className="w-3 h-3" /></Button>
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
            padding: { top: 16, bottom: isRewriteInputOpen ? 120 : 64 },
            scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 }
          }}
        />
        
        {/* Rewrite Input Bar - positioned relative to editor */}
        {isRewriteInputOpen && (
          <div className={`absolute bottom-0 left-0 right-0 z-20 border-t ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-2 p-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={rewritePrompt}
                  onChange={(e) => setRewritePrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (rewritePrompt.trim() && !isRewriting) {
                        handleRewrite();
                      }
                    }
                    if (e.key === 'Escape') {
                      setIsRewriteInputOpen(false);
                      setRewritePrompt('');
                    }
                  }}
                  placeholder="Enter instructions to rewrite selected content... (Enter to submit, Esc to close)"
                  className={`w-full px-3 py-2 pr-20 rounded-md border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  disabled={isRewriting}
                  autoFocus
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                  <button 
                    onClick={handleRewrite}
                    disabled={!rewritePrompt.trim() || isRewriting}
                    className={`h-6 w-6 p-0 rounded hover:bg-gray-100 ${isDarkMode ? 'hover:bg-gray-600 text-gray-300' : 'hover:bg-gray-100 text-gray-600'} disabled:opacity-50 disabled:cursor-not-allowed`} 
                    title="Submit (Enter)"
                  >
                    {isRewriting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                  <button 
                    onClick={() => {
                      setIsRewriteInputOpen(false);
                      setRewritePrompt('');
                    }}
                    className={`h-6 w-6 p-0 rounded hover:bg-gray-100 ${isDarkMode ? 'hover:bg-gray-600 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`} 
                    title="Close (Esc)"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className={`px-4 py-2 border-t text-xs flex justify-between transition-colors duration-300 z-10 ${isDarkMode ? 'bg-gray-800/50 border-gray-600 text-gray-400' : 'bg-gray-50/50 border-gray-200 text-gray-500'}`}>
        <span>{value.length} characters, {value.split('\n').length} lines</span>
        <span>Markdown | UTF-8 | Monaco Editor</span>
      </div>
      
      <DocumentationModal 
        isOpen={isDocsOpen} 
        onClose={() => setIsDocsOpen(false)} 
      />
    </div>
  )
}

export default MarkdownEditor

