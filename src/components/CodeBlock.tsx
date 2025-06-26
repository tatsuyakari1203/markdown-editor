import React from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'

interface CodeBlockProps {
  code: string
  language?: string
  isDarkMode: boolean
  showLineNumbers?: boolean
}

const CodeBlock: React.FC<CodeBlockProps> = ({ 
  code, 
  language = 'text', 
  isDarkMode, 
  showLineNumbers = true 
}) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }

  // Normalize language name
  const normalizedLanguage = language?.toLowerCase().trim() || 'text'
  
  // Map common language aliases
  const languageMap: { [key: string]: string } = {
    'js': 'javascript',
    'ts': 'typescript',
    'py': 'python',
    'rb': 'ruby',
    'sh': 'bash',
    'yml': 'yaml',
    'md': 'markdown'
  }
  
  const finalLanguage = languageMap[normalizedLanguage] || normalizedLanguage

  return (
    <div className="relative group code-block-wrapper">
      {/* Language label and copy button */}
      <div className={`flex items-center justify-between px-4 py-2 text-xs font-medium border-b code-block-header ${
        isDarkMode 
          ? 'bg-gray-800 border-gray-600 text-gray-300' 
          : 'bg-gray-100 border-gray-200 text-gray-600'
      }`}>
        <span className="code-block-language">
          {finalLanguage === 'text' ? 'Plain Text' : finalLanguage.toUpperCase()}
        </span>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors code-block-copy ${
            isDarkMode
              ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200'
              : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
          }`}
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      
      {/* Syntax highlighted code */}
      <div className="code-block-content">
        <SyntaxHighlighter
          language={finalLanguage}
          style={isDarkMode ? oneDark : oneLight}
          customStyle={{
            margin: 0,
            borderRadius: '0 0 6px 6px',
            fontSize: '14px',
            lineHeight: '1.5',
            padding: '16px',
            background: isDarkMode ? '#1f2937' : '#f9fafb'
          }}
          showLineNumbers={showLineNumbers}
          startingLineNumber={1}
          lineNumberStyle={{
            minWidth: '3em',
            paddingRight: '1em',
            color: isDarkMode ? '#6b7280' : '#9ca3af',
            borderRight: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
            marginRight: '1em',
            textAlign: 'right'
          }}
          wrapLines={true}
          wrapLongLines={true}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}

export default CodeBlock