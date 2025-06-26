import React, { useState, useCallback } from 'react'
import { 
  Clipboard, 
  Copy, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  FileText,
  Globe,
  Code,
  ArrowRight
} from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Separator } from './ui/separator'
import { useClipboardReader } from '../hooks/useClipboardReader'
import { useToast } from '../hooks/use-toast'

interface ClipboardConverterProps {
  onInsertMarkdown?: (markdown: string) => void
  isDarkMode: boolean
}

const ClipboardConverter: React.FC<ClipboardConverterProps> = ({ 
  onInsertMarkdown, 
  isDarkMode 
}) => {
  const [convertedMarkdown, setConvertedMarkdown] = useState('')
  const [showResult, setShowResult] = useState(false)
  const { 
    isLoading, 
    lastResult, 
    readClipboard, 
    hasClipboardAccess, 
    error 
  } = useClipboardReader()
  const { toast } = useToast()

  const handlePasteFromClipboard = useCallback(async () => {
    const result = await readClipboard()
    
    if (result.success && result.markdown) {
      setConvertedMarkdown(result.markdown)
      setShowResult(true)
      toast({
        title: "Clipboard converted successfully",
        description: `Converted ${result.markdown.length} characters to Markdown`,
      })
    } else if (result.isEmpty) {
      toast({
        title: "Clipboard is empty",
        description: "Copy some rich text content first, then try again",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Conversion failed",
        description: result.error || "Unable to convert clipboard content",
        variant: "destructive",
      })
    }
  }, [readClipboard, toast])

  const handleCopyMarkdown = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(convertedMarkdown)
      toast({
        title: "Copied to clipboard",
        description: "Markdown content copied successfully",
      })
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard",
        variant: "destructive",
      })
    }
  }, [convertedMarkdown, toast])

  const handleInsertToEditor = useCallback(() => {
    if (onInsertMarkdown && convertedMarkdown) {
      onInsertMarkdown(convertedMarkdown)
      toast({
        title: "Inserted to editor",
        description: "Markdown content added to your document",
      })
    }
  }, [convertedMarkdown, onInsertMarkdown, toast])

  const handleClear = useCallback(() => {
    setConvertedMarkdown('')
    setShowResult(false)
  }, [])

  const getSourceIcon = () => {
    if (lastResult?.html?.includes('docs.google')) return <Globe className="w-4 h-4" />
    if (lastResult?.html?.includes('microsoft')) return <FileText className="w-4 h-4" />
    return <Code className="w-4 h-4" />
  }

  const getStats = () => {
    if (!convertedMarkdown) return null
    
    const words = convertedMarkdown.trim().split(/\s+/).length
    const chars = convertedMarkdown.length
    const lines = convertedMarkdown.split('\n').length
    
    return { words, chars, lines }
  }

  const stats = getStats()

  return (
    <Card className={`w-full transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-gray-800/50 border-gray-700' 
        : 'bg-white border-gray-200'
    } shadow-lg backdrop-blur-sm`}>
      <CardHeader className="pb-4">
        <CardTitle className={`flex items-center space-x-2 text-lg ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          <Clipboard className="w-5 h-5" />
          <span>Clipboard to Markdown Converter</span>
        </CardTitle>
        <p className={`text-sm ${
          isDarkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Paste rich text from any source and convert it to clean Markdown
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handlePasteFromClipboard}
            disabled={isLoading || !hasClipboardAccess}
            className={`flex items-center space-x-2 ${
              isDarkMode 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-blue-500 hover:bg-blue-600'
            } text-white`}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Clipboard className="w-4 h-4" />
            )}
            <span>Paste & Convert</span>
          </Button>

          {showResult && (
            <>
              <Button
                onClick={handleCopyMarkdown}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <Copy className="w-4 h-4" />
                <span>Copy Markdown</span>
              </Button>

              {onInsertMarkdown && (
                <Button
                  onClick={handleInsertToEditor}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Insert to Editor</span>
                </Button>
              )}

              <Button
                onClick={handleClear}
                variant="ghost"
                size="sm"
                className="flex items-center space-x-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </Button>
            </>
          )}
        </div>

        {/* Status Messages */}
        {!hasClipboardAccess && (
          <div className={`flex items-center space-x-2 p-3 rounded-lg ${
            isDarkMode 
              ? 'bg-yellow-900/50 text-yellow-200 border border-yellow-700' 
              : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
          }`}>
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">
              Clipboard access requires HTTPS and modern browser support
            </span>
          </div>
        )}

        {error && (
          <div className={`flex items-center space-x-2 p-3 rounded-lg ${
            isDarkMode 
              ? 'bg-red-900/50 text-red-200 border border-red-700' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {lastResult?.success && showResult && (
          <div className={`flex items-center space-x-2 p-3 rounded-lg ${
            isDarkMode 
              ? 'bg-green-900/50 text-green-200 border border-green-700' 
              : 'bg-green-50 text-green-800 border border-green-200'
          }`}>
            <CheckCircle className="w-4 h-4" />
            <div className="flex items-center space-x-2">
              {getSourceIcon()}
              <span className="text-sm">
                Successfully converted clipboard content to Markdown
              </span>
            </div>
          </div>
        )}

        {/* Conversion Result */}
        {showResult && convertedMarkdown && (
          <div className="space-y-3">
            <Separator />
            
            {/* Stats */}
            {stats && (
              <div className="flex items-center space-x-4 text-xs">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  {stats.words} words
                </span>
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  {stats.chars} characters
                </span>
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  {stats.lines} lines
                </span>
              </div>
            )}

            {/* Converted Markdown Preview */}
            <div className="space-y-2">
              <h4 className={`text-sm font-medium ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Converted Markdown:
              </h4>
              <div className={`p-3 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-900/50 border-gray-600' 
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <pre className={`text-sm whitespace-pre-wrap font-mono ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`} style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {convertedMarkdown}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Usage Tips */}
        <div className={`text-xs space-y-1 ${
          isDarkMode ? 'text-gray-400' : 'text-gray-500'
        }`}>
          <p><strong>✨ Enhanced Google Docs Support:</strong> Advanced conversion with CSS parsing for headings, lists, and formatting</p>
          <p><strong>Supported sources:</strong> Google Docs, Microsoft Word, websites, and any rich text content</p>
          <p><strong>Keyboard shortcut:</strong> Ctrl+Shift+V for quick paste and convert</p>
          <p><strong>Features:</strong> Tables, lists, headers, links, code blocks, and semantic formatting</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default ClipboardConverter
