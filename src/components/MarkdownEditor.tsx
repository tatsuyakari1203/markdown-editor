import React, { useRef, useState, useCallback, useEffect } from 'react'
import { 
  RotateCcw, 
  RotateCw, 
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
  Loader2,
  Sparkles
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
import { useResponsive } from '../hooks/use-mobile'
import { normalizeTableContent } from '@/lib/table-normalizer'
import Editor from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import * as monaco from 'monaco-editor'

import geminiService from '../services/geminiService'
import AutoCompletePopup from './AutoCompletePopup'
import { useAutoComplete, AutoCompleteSuggestion } from '../hooks/useAutoComplete'
import { AutoCompleteContext } from '../services/autoCompleteService'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  isDarkMode: boolean
  editorRef?: React.MutableRefObject<editor.IStandaloneCodeEditor | null>
  apiKey?: string
  onAutoCompleteChange?: (status: { isEnabled: boolean; isLoading: boolean; lastActivity: string }) => void
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ value, onChange, isDarkMode, editorRef: externalEditorRef, apiKey = '', onAutoCompleteChange }) => {
  const internalEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const editorRef = externalEditorRef || internalEditorRef

  const [lineNumbers, setLineNumbers] = useState(true)

  const [isRewriteInputOpen, setIsRewriteInputOpen] = useState(false)
  const [rewritePrompt, setRewritePrompt] = useState('')
  const [isRewriting, setIsRewriting] = useState(false)
  const [autoCompletePosition, setAutoCompletePosition] = useState({ x: 0, y: 0 })
  const [showAutoComplete, setShowAutoComplete] = useState(false)
  const { isMobile } = useResponsive()
  const { toast } = useToast()
  
  // AutoComplete hook
  const autoComplete = useAutoComplete({
    apiKey,
    debounceMs: 500,
    minContextLength: 10,
    enabled: true
  })

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
    const hasSelection = selectedData && selectedData.text.trim();
    
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
      console.log('🔄 MarkdownEditor: Starting rewrite process...');
      // Initialize Gemini service if not already done
      const initialized = await geminiService.ensureInitialized(apiKey);
      if (!initialized) {
        const error = geminiService.getLastError();
        console.error('❌ MarkdownEditor: Gemini service initialization failed:', error);
        toast({
          title: "Initialization Failed",
          description: error || "Failed to initialize Gemini service. Please check your API key.",
          variant: "destructive",
        });
        return;
      }
      console.log('✅ MarkdownEditor: Gemini service initialized successfully');

      let result;
      if (hasSelection) {
        // Rewrite selected text
        console.log('🔄 MarkdownEditor: Rewriting selected text...');
        result = await geminiService.rewriteContent(selectedData.text, rewritePrompt);
        console.log('📝 MarkdownEditor: Rewrite result:', { success: result.success, hasContent: !!result.content, error: result.error });
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to rewrite content');
        }
        const rewrittenText = result.content;
        replaceText(selectedData.selection, rewrittenText);
      } else {
        // Generate new content at cursor position
        console.log('🔄 MarkdownEditor: Generating new content at cursor...');
        result = await geminiService.rewriteContent('', `Generate content based on this instruction: ${rewritePrompt}`);
        console.log('📝 MarkdownEditor: Generation result:', { success: result.success, hasContent: !!result.content, error: result.error });
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to generate content');
        }
        
        const editor = editorRef.current;
        if (editor) {
          const position = editor.getPosition();
          if (position) {
            editor.executeEdits('ai-rewrite', [{
              range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column
              },
              text: result.content,
              forceMoveMarkers: true
            }]);
          }
        }
      }
      
      setRewritePrompt('');
      setIsRewriteInputOpen(false);
      console.log('✅ MarkdownEditor: Process completed successfully');
      toast({
          title: 'Success',
          description: hasSelection ? 'Text has been rewritten successfully!' : 'Content has been generated successfully!'
        });
    } catch (error) {
      console.error('❌ MarkdownEditor: Unexpected error during process:', error);
      toast({
          title: 'Error',
          description: 'Unable to process request. Please try again.',
          variant: 'destructive',
        });
    } finally {
      console.log('🏁 MarkdownEditor: Process finished');
      setIsRewriting(false);
    }
  };

  const handleRewriteInputToggle = (isOpen: boolean) => {
    setIsRewriteInputOpen(isOpen);
    if (!isOpen) {
      setRewritePrompt('');
    }
  };
  
  const handleAutoCompleteToggle = () => {
    const wasEnabled = autoComplete.isEnabled
    autoComplete.toggleEnabled()
    if (wasEnabled) {
      setShowAutoComplete(false)
    }
    toast({
      title: !wasEnabled ? "AutoComplete Enabled" : "AutoComplete Disabled",
      description: !wasEnabled 
        ? "AI-powered suggestions are now active" 
        : "AI-powered suggestions are disabled",
      duration: 2000
    })
  }
  
  const handleSuggestionSelect = (suggestion: AutoCompleteSuggestion) => {
    if (editorRef.current) {
      const editor = editorRef.current
      const position = editor.getPosition()
      if (position) {
        const model = editor.getModel()
        if (model) {
          // Get current line text to check context
          const currentLine = model.getLineContent(position.lineNumber)
          const textBeforeCursor = currentLine.substring(0, position.column - 1)
          const textAfterCursor = currentLine.substring(position.column - 1)
          
          // Clean suggestion text
          let suggestionText = suggestion.text.trim()
          
          // Smart spacing: add space before if needed
          const needsSpaceBefore = textBeforeCursor.length > 0 && 
                                   !textBeforeCursor.endsWith(' ') && 
                                   !textBeforeCursor.endsWith('\n') &&
                                   !suggestionText.startsWith(' ') &&
                                   !/^[.,!?;:]/.test(suggestionText)
          
          // Smart spacing: add space after if needed
          const needsSpaceAfter = textAfterCursor.length > 0 && 
                                  !textAfterCursor.startsWith(' ') && 
                                  !textAfterCursor.startsWith('\n') &&
                                  !suggestionText.endsWith(' ') &&
                                  !/[.,!?;:]$/.test(suggestionText) &&
                                  !/^[.,!?;:]/.test(textAfterCursor)
          
          // Build final text with proper spacing
          if (needsSpaceBefore) suggestionText = ' ' + suggestionText
          if (needsSpaceAfter) suggestionText = suggestionText + ' '
          
          const range = {
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column
          }
          
          editor.executeEdits('autocomplete', [{
            range,
            text: suggestionText
          }])
          
          // Move cursor to end of inserted text
          const newPosition = {
            lineNumber: position.lineNumber,
            column: position.column + suggestionText.length
          }
          editor.setPosition(newPosition)
          
          // Focus back to editor
          editor.focus()
        }
      }
    }
    setShowAutoComplete(false)
  }

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
          [/\*\*[^*]*\*\*/, 'markup.bold'],
          [/__[^_]*__/, 'markup.bold'],
          
          // Italic
          [/\*[^*]*\*/, 'markup.italic'],
          [/_[^_]*_/, 'markup.italic'],
          
          // Links
          [/\[[^\]]+\]\([^)]+\)/, 'markup.link'],
          
          // Images
          [/!\[[^\]]*\]\([^)]+\)/, 'markup.link'],
          
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
      
      // Handle autocomplete on text change
      if (autoComplete.isEnabled && editorRef.current) {
        const editor = editorRef.current
        const position = editor.getPosition()
        if (position) {
          const model = editor.getModel()
          if (model) {
            const lineContent = model.getLineContent(position.lineNumber)
            const textBeforeCursor = lineContent.substring(0, position.column - 1)
            const textAfterCursor = lineContent.substring(position.column - 1)
            
            // Create enhanced context for autocomplete
            const allTextBefore = model.getValueInRange({
              startLineNumber: 1,
              startColumn: 1,
              endLineNumber: position.lineNumber,
              endColumn: position.column
            })
            
            const context: AutoCompleteContext = {
              textBeforeCursor: allTextBefore,
              textAfterCursor,
              currentLine: lineContent,
              lineNumber: position.lineNumber,
              column: position.column,
              fullText: newValue,
              cursorPosition: model.getOffsetAt(position)
            }
            
            // Improved trigger conditions with newline support
            const currentLineText = lineContent.substring(0, position.column - 1)
            const isNewLine = currentLineText.length === 0 && position.lineNumber > 1
            const hasMinContent = currentLineText.length >= 5
            const isNotJustSpace = !currentLineText.endsWith('  ') // Allow single space
            const hasContent = currentLineText.trim().length > 1
            const notInCodeBlock = !/^\s*```/.test(lineContent)
            const isListStart = /^\s*[-*+]\s*$/.test(currentLineText) || /^\s*\d+\.\s*$/.test(currentLineText)
            const isHeadingStart = /^#{1,6}\s*$/.test(currentLineText)
            const hasDocumentContent = allTextBefore.trim().length > 10
            
            const shouldTrigger = ((hasMinContent && isNotJustSpace && hasContent && notInCodeBlock) ||
                                 (isNewLine && notInCodeBlock && hasDocumentContent) ||
                                 (isListStart && notInCodeBlock) ||
                                 (isHeadingStart && notInCodeBlock)) && hasDocumentContent
            
            if (shouldTrigger) {
              autoComplete.getSuggestions(context)
            } else {
              setShowAutoComplete(false)
            }
          }
        }
      }
    }
  }, [onChange, autoComplete])

  // Show AutoComplete popup when suggestions are available
  useEffect(() => {
    if (autoComplete.suggestions.length > 0 && !autoComplete.isLoading && editorRef.current) {
      const editor = editorRef.current
      const position = editor.getPosition()
      
      if (position) {
        const editorDom = editor.getDomNode()
        if (editorDom) {
          const coords = editor.getScrolledVisiblePosition(position)
          if (coords) {
            const rect = editorDom.getBoundingClientRect()
            const newPosition = {
              x: rect.left + coords.left,
              y: rect.top + coords.top + coords.height
            }
            setAutoCompletePosition(newPosition)
            setShowAutoComplete(true)
          } else {
            setShowAutoComplete(false)
          }
        } else {
          setShowAutoComplete(false)
        }
      } else {
        setShowAutoComplete(false)
      }
    } else if (autoComplete.suggestions.length === 0) {
      setShowAutoComplete(false)
    }
  }, [autoComplete.suggestions, autoComplete.isLoading])

  // Track AutoComplete status changes
  useEffect(() => {
    if (onAutoCompleteChange) {
      const getLastActivity = () => {
        if (autoComplete.isLoading) return 'Generating...'
        if (autoComplete.suggestions.length > 0) return `${autoComplete.suggestions.length} suggestions`
        if (autoComplete.error) return 'Error'
        return autoComplete.isEnabled ? 'Ready' : 'Disabled'
      }

      onAutoCompleteChange({
        isEnabled: autoComplete.isEnabled,
        isLoading: autoComplete.isLoading,
        lastActivity: getLastActivity()
      })
    }
  }, [autoComplete.isEnabled, autoComplete.isLoading, autoComplete.suggestions.length, autoComplete.error, onAutoCompleteChange])

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
      <div className="flex flex-wrap items-center gap-1">
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
      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-2 border-b gap-2 ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
        <div className="flex flex-wrap items-center gap-1">
          {renderToolbar()}
          
          {/* AI Toolbar */}
          <AIToolbar 
            editorRef={editorRef}
            isDarkMode={isDarkMode}
            apiKey={apiKey}
            onRewriteInputToggle={handleRewriteInputToggle}
          />
          
          {/* AutoComplete Toggle */}
          <Button 
            size="sm" 
            variant="ghost"
            onClick={handleAutoCompleteToggle} 
            title={`AutoComplete ${autoComplete.isEnabled ? 'Enabled' : 'Disabled'} (AI-powered suggestions)`}
            className={`h-8 px-2 transition-all duration-200 ${
              isDarkMode 
                ? 'hover:bg-gray-700' 
                : 'hover:bg-gray-100'
            }`}
          >
            <Sparkles className={`w-3 h-3 transition-all duration-200 ${
              autoComplete.isEnabled 
                ? isDarkMode 
                  ? 'text-gray-200' 
                  : 'text-gray-700'
                : isDarkMode 
                  ? 'text-gray-600' 
                  : 'text-gray-400'
            }`} />
          </Button>
          
          <Button size="sm" variant="ghost" onClick={undo} title="Undo (Ctrl+Z)"><RotateCcw className="w-3 h-3" /></Button>
          <Button size="sm" variant="ghost" onClick={redo} title="Redo (Ctrl+Y)"><RotateCw className="w-3 h-3" /></Button>


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
            scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
            // Disable built-in autocomplete to avoid conflicts
            quickSuggestions: false,
            suggestOnTriggerCharacters: false,
            acceptSuggestionOnEnter: 'off',
            tabCompletion: 'off',
            wordBasedSuggestions: 'off',
            // Allow our custom keyboard handling
            contextmenu: true,
            selectOnLineNumbers: true
          }}
        />
        
        {/* Rewrite Input Bar - positioned relative to editor */}
        {isRewriteInputOpen && (
          <div className={`absolute bottom-0 left-0 right-0 z-20 border-t ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3">
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
                  className={`w-full px-3 py-2 pr-2 sm:pr-20 rounded-md border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  disabled={isRewriting}
                  autoFocus
                />
                <div className="hidden sm:flex absolute right-2 top-1/2 transform -translate-y-1/2 items-center gap-1">
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
              {/* Mobile buttons - shown below input on small screens */}
              <div className="flex sm:hidden items-center gap-2 justify-end">
                <button 
                  onClick={handleRewrite}
                  disabled={!rewritePrompt.trim() || isRewriting}
                  className={`h-8 px-3 rounded-md text-sm font-medium ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'} disabled:opacity-50 disabled:cursor-not-allowed`} 
                  title="Submit"
                >
                  {isRewriting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Submit'
                  )}
                </button>
                <button 
                  onClick={() => {
                    setIsRewriteInputOpen(false);
                    setRewritePrompt('');
                  }}
                  className={`h-8 px-3 rounded-md text-sm font-medium ${isDarkMode ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`} 
                  title="Close"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* AutoComplete Popup */}
        {showAutoComplete && autoComplete.suggestions.length > 0 && (
          <div style={{ position: 'relative', zIndex: 10000 }}>
            <AutoCompletePopup
              suggestions={autoComplete.suggestions}
              isLoading={autoComplete.isLoading}
              position={autoCompletePosition}
              onSelect={handleSuggestionSelect}
              onClose={() => setShowAutoComplete(false)}
              isDarkMode={isDarkMode}
              visible={true}
            />
          </div>
        )}
      </div>
      
      <div className={`px-4 py-2 border-t text-xs flex justify-between transition-colors duration-300 z-10 ${isDarkMode ? 'bg-gray-800/50 border-gray-600 text-gray-400' : 'bg-gray-50/50 border-gray-200 text-gray-500'}`}>
        <span>{value.length} characters, {value.split('\n').length} lines</span>
        <span>Markdown | UTF-8 | Monaco Editor</span>
      </div>
      

    </div>
  )
}

export default MarkdownEditor

