import React, { useEffect, useRef } from 'react'
import hljs from 'highlight.js/lib/core'

// Import only popular languages to keep bundle size small
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import java from 'highlight.js/lib/languages/java'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import php from 'highlight.js/lib/languages/php'
import ruby from 'highlight.js/lib/languages/ruby'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'
import swift from 'highlight.js/lib/languages/swift'
import kotlin from 'highlight.js/lib/languages/kotlin'
import scala from 'highlight.js/lib/languages/scala'
import css from 'highlight.js/lib/languages/css'
import html from 'highlight.js/lib/languages/xml'
import json from 'highlight.js/lib/languages/json'
import yaml from 'highlight.js/lib/languages/yaml'
import markdown from 'highlight.js/lib/languages/markdown'
import bash from 'highlight.js/lib/languages/bash'
import sql from 'highlight.js/lib/languages/sql'
import dockerfile from 'highlight.js/lib/languages/dockerfile'
import nginx from 'highlight.js/lib/languages/nginx'

// Import themes
import 'highlight.js/styles/github.css'
import 'highlight.js/styles/github-dark.css'

// Register languages
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('java', java)
hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('csharp', csharp)
hljs.registerLanguage('php', php)
hljs.registerLanguage('ruby', ruby)
hljs.registerLanguage('go', go)
hljs.registerLanguage('rust', rust)
hljs.registerLanguage('swift', swift)
hljs.registerLanguage('kotlin', kotlin)
hljs.registerLanguage('scala', scala)
hljs.registerLanguage('css', css)
hljs.registerLanguage('html', html)
hljs.registerLanguage('xml', html)
hljs.registerLanguage('json', json)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('yml', yaml)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('sh', bash)
hljs.registerLanguage('shell', bash)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('dockerfile', dockerfile)
hljs.registerLanguage('nginx', nginx)

// Language mapping for common aliases
const languageMap: { [key: string]: string } = {
  'js': 'javascript',
  'ts': 'typescript',
  'py': 'python',
  'rb': 'ruby',
  'c++': 'cpp',
  'c#': 'csharp',
  'cs': 'csharp',
  'golang': 'go',
  'rs': 'rust',
  'kt': 'kotlin',
  'md': 'markdown',
  'yml': 'yaml',
  'ps1': 'bash',
  'powershell': 'bash'
}

interface HighlightCodeBlockProps {
  code: string
  language?: string
  isDarkMode: boolean
  showLineNumbers?: boolean
}

const HighlightCodeBlock: React.FC<HighlightCodeBlockProps> = ({ 
  code, 
  language = 'text', 
  isDarkMode, 
  showLineNumbers = true 
}) => {
  const codeRef = useRef<HTMLElement>(null)
  const preRef = useRef<HTMLPreElement>(null)

  // Normalize language name and apply mapping
  const normalizedLanguage = language?.toLowerCase().trim() || 'text'
  const finalLanguage = languageMap[normalizedLanguage] || normalizedLanguage

  useEffect(() => {
    if (codeRef.current && preRef.current) {
      const codeElement = codeRef.current
      const preElement = preRef.current
      
      // Set the code content
      codeElement.textContent = code
      
      // Apply highlight.js
      if (finalLanguage !== 'text' && hljs.getLanguage(finalLanguage)) {
        try {
          const result = hljs.highlight(code, { language: finalLanguage })
          codeElement.innerHTML = result.value
          codeElement.className = `hljs language-${finalLanguage}`
        } catch (error) {
          console.warn(`Failed to highlight code with language: ${finalLanguage}`, error)
          // Fallback to auto-detection
          try {
            const result = hljs.highlightAuto(code)
            codeElement.innerHTML = result.value
            codeElement.className = `hljs language-${result.language || 'text'}`
          } catch (autoError) {
            console.warn('Failed to auto-highlight code', autoError)
            codeElement.textContent = code
            codeElement.className = 'hljs'
          }
        }
      } else {
        // No highlighting for unknown languages
        codeElement.textContent = code
        codeElement.className = 'hljs'
      }
      
      // Add line numbers if requested
      if (showLineNumbers) {
        const lines = code.split('\n')
        const lineNumbersHtml = lines.map((_, index) => 
          `<span class="line-number">${index + 1}</span>`
        ).join('')
        
        preElement.setAttribute('data-line-numbers', 'true')
        preElement.style.position = 'relative'
        
        // Remove existing line numbers
        const existingLineNumbers = preElement.querySelector('.line-numbers-wrapper')
        if (existingLineNumbers) {
          existingLineNumbers.remove()
        }
        
        // Add new line numbers
        const lineNumbersWrapper = document.createElement('div')
        lineNumbersWrapper.className = 'line-numbers-wrapper'
        lineNumbersWrapper.innerHTML = lineNumbersHtml
        preElement.insertBefore(lineNumbersWrapper, codeElement)
      }
      
      // Add copy button
      addCopyButton(preElement, code)
    }
  }, [code, finalLanguage, showLineNumbers])

  const addCopyButton = (preElement: HTMLPreElement, codeText: string) => {
    // Remove existing copy button
    const existingButton = preElement.querySelector('.copy-button')
    if (existingButton) {
      existingButton.remove()
    }
    
    const copyButton = document.createElement('button')
    copyButton.className = 'copy-button'
    copyButton.textContent = 'Copy'
    copyButton.onclick = async () => {
      try {
        await navigator.clipboard.writeText(codeText)
        copyButton.textContent = 'Copied!'
        setTimeout(() => {
          copyButton.textContent = 'Copy'
        }, 2000)
      } catch (error) {
        copyButton.textContent = 'Failed'
        setTimeout(() => {
          copyButton.textContent = 'Copy'
        }, 2000)
      }
    }
    
    preElement.style.position = 'relative'
    preElement.appendChild(copyButton)
  }

  return (
    <div className={`code-block-wrapper ${isDarkMode ? 'dark' : 'light'}`}>
      <pre 
        ref={preRef} 
        className={`hljs-pre ${showLineNumbers ? 'with-line-numbers' : ''}`}
      >
        <code ref={codeRef} className="hljs">
          {code}
        </code>
      </pre>
    </div>
  )
}

export default HighlightCodeBlock