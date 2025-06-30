import React from 'react'
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import { Copy, Check } from 'lucide-react'
import { useState, useEffect } from 'react'

// Lazy load languages to reduce bundle size
const loadLanguage = async (language: string) => {
  const normalizedLang = language.toLowerCase()
  
  try {
    switch (normalizedLang) {
      case 'javascript':
      case 'js':
        const js = await import('react-syntax-highlighter/dist/esm/languages/prism/javascript')
        SyntaxHighlighter.registerLanguage('javascript', js.default)
        SyntaxHighlighter.registerLanguage('js', js.default)
        break
      case 'typescript':
      case 'ts':
        const ts = await import('react-syntax-highlighter/dist/esm/languages/prism/typescript')
        SyntaxHighlighter.registerLanguage('typescript', ts.default)
        SyntaxHighlighter.registerLanguage('ts', ts.default)
        break
      case 'python':
      case 'py':
        const python = await import('react-syntax-highlighter/dist/esm/languages/prism/python')
        SyntaxHighlighter.registerLanguage('python', python.default)
        SyntaxHighlighter.registerLanguage('py', python.default)
        break
      case 'css':
        const css = await import('react-syntax-highlighter/dist/esm/languages/prism/css')
        SyntaxHighlighter.registerLanguage('css', css.default)
        break
      case 'json':
        const json = await import('react-syntax-highlighter/dist/esm/languages/prism/json')
        SyntaxHighlighter.registerLanguage('json', json.default)
        break
      case 'jsx':
        const jsx = await import('react-syntax-highlighter/dist/esm/languages/prism/jsx')
        SyntaxHighlighter.registerLanguage('jsx', jsx.default)
        break
      case 'tsx':
        const tsx = await import('react-syntax-highlighter/dist/esm/languages/prism/tsx')
        SyntaxHighlighter.registerLanguage('tsx', tsx.default)
        break
      case 'bash':
      case 'sh':
        const bash = await import('react-syntax-highlighter/dist/esm/languages/prism/bash')
        SyntaxHighlighter.registerLanguage('bash', bash.default)
        SyntaxHighlighter.registerLanguage('sh', bash.default)
        break
      case 'xml':
       case 'html':
         const markup = await import('react-syntax-highlighter/dist/esm/languages/prism/markup')
         SyntaxHighlighter.registerLanguage('xml', markup.default)
         SyntaxHighlighter.registerLanguage('html', markup.default)
         break
      case 'markdown':
      case 'md':
        const markdown = await import('react-syntax-highlighter/dist/esm/languages/prism/markdown')
        SyntaxHighlighter.registerLanguage('markdown', markdown.default)
        SyntaxHighlighter.registerLanguage('md', markdown.default)
        break
      case 'sql':
        const sql = await import('react-syntax-highlighter/dist/esm/languages/prism/sql')
        SyntaxHighlighter.registerLanguage('sql', sql.default)
        break
      case 'yaml':
       case 'yml':
         const yaml = await import('react-syntax-highlighter/dist/esm/languages/prism/yaml')
         SyntaxHighlighter.registerLanguage('yaml', yaml.default)
         SyntaxHighlighter.registerLanguage('yml', yaml.default)
         break
       case 'java':
         const java = await import('react-syntax-highlighter/dist/esm/languages/prism/java')
         SyntaxHighlighter.registerLanguage('java', java.default)
         break
       case 'csharp':
       case 'cs':
         const csharp = await import('react-syntax-highlighter/dist/esm/languages/prism/csharp')
         SyntaxHighlighter.registerLanguage('csharp', csharp.default)
         SyntaxHighlighter.registerLanguage('cs', csharp.default)
         break
       case 'cpp':
       case 'c++':
         const cpp = await import('react-syntax-highlighter/dist/esm/languages/prism/cpp')
         SyntaxHighlighter.registerLanguage('cpp', cpp.default)
         SyntaxHighlighter.registerLanguage('c++', cpp.default)
         break
       case 'c':
         const c = await import('react-syntax-highlighter/dist/esm/languages/prism/c')
         SyntaxHighlighter.registerLanguage('c', c.default)
         break
       case 'php':
         const php = await import('react-syntax-highlighter/dist/esm/languages/prism/php')
         SyntaxHighlighter.registerLanguage('php', php.default)
         break
       case 'ruby':
       case 'rb':
         const ruby = await import('react-syntax-highlighter/dist/esm/languages/prism/ruby')
         SyntaxHighlighter.registerLanguage('ruby', ruby.default)
         SyntaxHighlighter.registerLanguage('rb', ruby.default)
         break
       case 'go':
       case 'golang':
         const go = await import('react-syntax-highlighter/dist/esm/languages/prism/go')
         SyntaxHighlighter.registerLanguage('go', go.default)
         SyntaxHighlighter.registerLanguage('golang', go.default)
         break
       case 'rust':
       case 'rs':
         const rust = await import('react-syntax-highlighter/dist/esm/languages/prism/rust')
         SyntaxHighlighter.registerLanguage('rust', rust.default)
         SyntaxHighlighter.registerLanguage('rs', rust.default)
         break
       case 'kotlin':
       case 'kt':
         const kotlin = await import('react-syntax-highlighter/dist/esm/languages/prism/kotlin')
         SyntaxHighlighter.registerLanguage('kotlin', kotlin.default)
         SyntaxHighlighter.registerLanguage('kt', kotlin.default)
         break
       case 'swift':
         const swift = await import('react-syntax-highlighter/dist/esm/languages/prism/swift')
         SyntaxHighlighter.registerLanguage('swift', swift.default)
         break
       case 'dart':
         const dart = await import('react-syntax-highlighter/dist/esm/languages/prism/dart')
         SyntaxHighlighter.registerLanguage('dart', dart.default)
         break
       case 'scala':
         const scala = await import('react-syntax-highlighter/dist/esm/languages/prism/scala')
         SyntaxHighlighter.registerLanguage('scala', scala.default)
         break
       case 'r':
         const r = await import('react-syntax-highlighter/dist/esm/languages/prism/r')
         SyntaxHighlighter.registerLanguage('r', r.default)
         break
       case 'matlab':
         const matlab = await import('react-syntax-highlighter/dist/esm/languages/prism/matlab')
         SyntaxHighlighter.registerLanguage('matlab', matlab.default)
         break
       case 'powershell':
       case 'ps1':
         const powershell = await import('react-syntax-highlighter/dist/esm/languages/prism/powershell')
         SyntaxHighlighter.registerLanguage('powershell', powershell.default)
         SyntaxHighlighter.registerLanguage('ps1', powershell.default)
         break
       case 'docker':
       case 'dockerfile':
         const docker = await import('react-syntax-highlighter/dist/esm/languages/prism/docker')
         SyntaxHighlighter.registerLanguage('docker', docker.default)
         SyntaxHighlighter.registerLanguage('dockerfile', docker.default)
         break
       case 'nginx':
         const nginx = await import('react-syntax-highlighter/dist/esm/languages/prism/nginx')
         SyntaxHighlighter.registerLanguage('nginx', nginx.default)
         break
       case 'graphql':
         const graphql = await import('react-syntax-highlighter/dist/esm/languages/prism/graphql')
         SyntaxHighlighter.registerLanguage('graphql', graphql.default)
         break
       case 'toml':
         const toml = await import('react-syntax-highlighter/dist/esm/languages/prism/toml')
         SyntaxHighlighter.registerLanguage('toml', toml.default)
         break
       case 'ini':
         const ini = await import('react-syntax-highlighter/dist/esm/languages/prism/ini')
         SyntaxHighlighter.registerLanguage('ini', ini.default)
         break
       default:
         // For unsupported languages, fallback to text
         break
    }
  } catch (error) {
    // Silently handle language loading errors
  }
}

// Lazy load styles to avoid large bundle size
const loadStyles = async (isDark: boolean) => {
  const { oneDark, oneLight } = await import('react-syntax-highlighter/dist/esm/styles/prism')
  return isDark ? oneDark : oneLight
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
  const [copied, setCopied] = useState(false)
  const [style, setStyle] = useState<any>(null)
  const [languageLoaded, setLanguageLoaded] = useState(false)

  // Load style when component mounts or theme changes
  useEffect(() => {
    loadStyles(isDarkMode).then(setStyle)
  }, [isDarkMode])

  // Load language when component mounts or language changes
  useEffect(() => {
    const loadLang = async () => {
      if (language && language !== 'text') {
        await loadLanguage(language)
        setLanguageLoaded(true)
      } else {
        setLanguageLoaded(true)
      }
    }
    loadLang()
  }, [language])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // Silently handle copy failures
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
    'md': 'markdown',
    'cs': 'csharp',
    'c++': 'cpp',
    'golang': 'go',
    'rs': 'rust',
    'kt': 'kotlin',
    'ps1': 'powershell',
    'dockerfile': 'docker'
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
        {languageLoaded && style ? (
        <SyntaxHighlighter
          language={finalLanguage}
          style={style ? {
            ...style,
            'pre[class*="language-"]': {
              ...style['pre[class*="language-"]'],
              background: 'transparent !important',
              backgroundColor: 'transparent !important',
              boxShadow: 'none !important',
              textShadow: 'none !important'
            },
            'code[class*="language-"]': {
              ...style['code[class*="language-"]'],
              textShadow: 'none !important'
            }
          } : {}}
          customStyle={{
            margin: 0,
            borderRadius: '0 0 6px 6px',
            fontSize: '14px',
            lineHeight: '1.5',
            padding: '16px',
            background: isDarkMode ? '#1f2937' : '#f9fafb',
            boxShadow: 'none',
            textShadow: 'none'
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
        ) : (
          <div className={`p-4 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Loading syntax highlighter...
          </div>
        )}
      </div>
    </div>
  )
}

export default CodeBlock