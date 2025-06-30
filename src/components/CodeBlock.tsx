import React from 'react'
import React, { useEffect, useRef } from 'react'
import Prism from 'prismjs'

// Note: Prism.js plugins and languages are imported in MarkdownPreview.tsx
// to avoid duplicate imports and ensure proper loading order

// Language mapping for common aliases
const languageMap: { [key: string]: string } = {
  'js': 'javascript',
  'ts': 'typescript', 
  'py': 'python',
  'rb': 'ruby',
  'sh': 'bash',
  'yml': 'yaml',
  'md': 'markdown',
  'cs': 'csharp',
  'c++': 'cpp',
  'golang': 'go',
  'rs': 'rust',
  'kt': 'kotlin',
  'ps1': 'powershell',
  'dockerfile': 'docker'
}

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
  const preRef = useRef<HTMLPreElement>(null)
  const codeRef = useRef<HTMLElement>(null)

  // Normalize language name and apply mapping
  const normalizedLanguage = language?.toLowerCase().trim() || 'text'
  const finalLanguage = languageMap[normalizedLanguage] || normalizedLanguage

  useEffect(() => {
    if (preRef.current && codeRef.current) {
      // Set up the code element with proper classes
      const codeElement = codeRef.current
      const preElement = preRef.current
      
      // Clear existing classes and add new ones
      codeElement.className = finalLanguage !== 'text' ? `language-${finalLanguage}` : ''
      preElement.className = `language-${finalLanguage}${showLineNumbers ? ' line-numbers' : ''} toolbar`
      
      // Set the code content
      codeElement.textContent = code
      
      // Highlight the code
      if (typeof Prism !== 'undefined') {
        Prism.highlightElement(codeElement)
      }
    }
  }, [code, finalLanguage, showLineNumbers])

  return (
    <div className="code-toolbar">
      <pre ref={preRef} className={`language-${finalLanguage}${showLineNumbers ? ' line-numbers' : ''} toolbar`}>
        <code ref={codeRef} className={finalLanguage !== 'text' ? `language-${finalLanguage}` : ''}>
          {code}
        </code>
      </pre>
    </div>
  )
}

export default CodeBlock