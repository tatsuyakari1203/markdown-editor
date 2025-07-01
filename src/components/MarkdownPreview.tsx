import React, { useRef, useEffect, useMemo } from 'react'
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

import '../styles/markdown-base.css'

interface MarkdownPreviewProps {
  html: string // Nhận HTML thay vì Markdown
  isDarkMode: boolean
  isLoading: boolean
  previewRef?: React.MutableRefObject<HTMLDivElement | null>
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  html,
  isDarkMode,
  isLoading,
  previewRef: externalPreviewRef,
}) => {
  const internalPreviewRef = useRef<HTMLDivElement>(null);
  const previewRef = externalPreviewRef || internalPreviewRef;
  const contentRef = useRef<HTMLDivElement>(null);

  const previewClassName = useMemo(
    () => {
      const baseClasses = 'flex-1 p-6 pb-16 overflow-auto markdown-content transition-colors duration-300';
      const themeClasses = isDarkMode 
        ? 'bg-gray-900 text-gray-100' 
        : 'bg-white text-gray-900';
      return `${baseClasses} ${themeClasses}`;
    },
    [isDarkMode]
  );

  // Enhanced highlight.js initialization
  useEffect(() => {
    if (html && contentRef.current) {
      const initializeHighlight = () => {
        try {
          // Process all code blocks
          const preElements = contentRef.current?.querySelectorAll('pre[class*="language-"]');
          
          preElements?.forEach(pre => {
            // Extract language from class
            const langClass = Array.from(pre.classList).find(cls => cls.startsWith('language-'));
            const codeElement = pre.querySelector('code');
            
            if (codeElement && langClass) {
              const language = langClass.replace('language-', '');
              const normalizedLanguage = languageMap[language] || language;
              const codeText = codeElement.textContent || '';
              
              // Clear existing content
              codeElement.innerHTML = '';
              
              // Apply highlight.js
              if (normalizedLanguage !== 'text' && hljs.getLanguage(normalizedLanguage)) {
                try {
                  const result = hljs.highlight(codeText, { language: normalizedLanguage });
                  codeElement.innerHTML = result.value;
                  codeElement.className = `hljs language-${normalizedLanguage}`;
                } catch (error) {
                  console.warn(`Failed to highlight code with language: ${normalizedLanguage}`, error);
                  // Fallback to auto-detection
                  try {
                    const result = hljs.highlightAuto(codeText);
                    codeElement.innerHTML = result.value;
                    codeElement.className = `hljs language-${result.language || 'text'}`;
                  } catch (autoError) {
                    console.warn('Failed to auto-highlight code', autoError);
                    codeElement.textContent = codeText;
                    codeElement.className = 'hljs';
                  }
                }
              } else {
                // No highlighting for unknown languages
                codeElement.textContent = codeText;
                codeElement.className = 'hljs';
              }
              
              // Add wrapper div for styling
              if (!pre.parentElement?.classList.contains('code-block-wrapper')) {
                const wrapper = document.createElement('div');
                wrapper.className = `code-block-wrapper ${isDarkMode ? 'dark' : 'light'}`;
                pre.parentNode?.insertBefore(wrapper, pre);
                wrapper.appendChild(pre);
              }
              
              // Update wrapper theme
              const wrapper = pre.parentElement;
              if (wrapper?.classList.contains('code-block-wrapper')) {
                wrapper.className = `code-block-wrapper ${isDarkMode ? 'dark' : 'light'}`;
              }
              
              // Add line numbers
              addLineNumbers(pre, codeText);
              
              // Add copy button
              addCopyButton(pre, codeText);
            }
          });
          
        } catch (error) {
          console.error('Failed to initialize highlight.js:', error);
        }
      };
      
      // Use setTimeout to ensure DOM is ready
      const timeoutId = setTimeout(initializeHighlight, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [html, isDarkMode]);
  
  const addLineNumbers = (preElement: HTMLPreElement, codeText: string) => {
    // Remove existing line numbers
    const existingLineNumbers = preElement.querySelector('.line-numbers-wrapper');
    if (existingLineNumbers) {
      existingLineNumbers.remove();
    }
    
    const lines = codeText.split('\n');
    const lineNumbersHtml = lines.map((_, index) => 
      `<span class="line-number">${index + 1}</span>`
    ).join('');
    
    preElement.classList.add('hljs-pre', 'with-line-numbers');
    preElement.style.position = 'relative';
    
    // Add new line numbers
    const lineNumbersWrapper = document.createElement('div');
    lineNumbersWrapper.className = 'line-numbers-wrapper';
    lineNumbersWrapper.innerHTML = lineNumbersHtml;
    preElement.insertBefore(lineNumbersWrapper, preElement.firstChild);
  };
  
  const addCopyButton = (preElement: HTMLPreElement, codeText: string) => {
    // Remove existing copy button
    const existingButton = preElement.querySelector('.copy-button');
    if (existingButton) {
      existingButton.remove();
    }
    
    const copyButton = document.createElement('button');
    copyButton.className = 'copy-button';
    copyButton.textContent = 'Copy';
    copyButton.onclick = async () => {
      try {
        await navigator.clipboard.writeText(codeText);
        copyButton.textContent = 'Copied!';
        setTimeout(() => {
          copyButton.textContent = 'Copy';
        }, 2000);
      } catch (error) {
        copyButton.textContent = 'Failed';
        setTimeout(() => {
          copyButton.textContent = 'Copy';
        }, 2000);
      }
    };
    
    preElement.style.position = 'relative';
    preElement.appendChild(copyButton);
  };



  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div ref={previewRef} className={previewClassName}>
        {isLoading && !html ? (
          <div className="flex items-center justify-center h-full">Đang xử lý...</div>
        ) : (
          <div ref={contentRef} dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </div>
      {/* Footer có thể giữ nguyên */}
    </div>
  );
};

export default MarkdownPreview
