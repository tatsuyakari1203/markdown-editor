import React, { useRef, useEffect, useMemo } from 'react'
import Prism from 'prismjs';

// Import plugins in correct order
import 'prismjs/plugins/toolbar/prism-toolbar';
import 'prismjs/plugins/toolbar/prism-toolbar.css';
import 'prismjs/plugins/copy-to-clipboard/prism-copy-to-clipboard';
import 'prismjs/plugins/line-numbers/prism-line-numbers';
import 'prismjs/plugins/line-numbers/prism-line-numbers.css';

// Only load essential base languages to prevent dependency issues
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-markdown';

// Language loading utility
const loadLanguageIfNeeded = async (language: string) => {
  if (!Prism.languages[language]) {
    try {
      // Handle language dependencies
      const dependencies: Record<string, string[]> = {
        'cpp': ['clike'],
        'java': ['clike'],
        'csharp': ['clike'],
        'jsx': ['javascript'],
        'tsx': ['typescript', 'jsx'],
        'php': ['clike'],
        'scala': ['java'],
        'kotlin': ['clike'],
        'swift': ['clike'],
        'dart': ['clike'],
        'go': ['clike'],
        'rust': ['clike']
      };
      
      // Load dependencies first
      if (dependencies[language]) {
        for (const dep of dependencies[language]) {
          if (!Prism.languages[dep]) {
            await import(/* @vite-ignore */ `prismjs/components/prism-${dep}`);
          }
        }
      }
      
      // Load the target language
      await import(/* @vite-ignore */ `prismjs/components/prism-${language}`);
    } catch (error) {
      console.warn(`Failed to load language: ${language}`, error);
    }
  }
};

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

  // Enhanced Prism.js initialization with dynamic language loading
  useEffect(() => {
    if (html && contentRef.current) {
      const initializePrism = async () => {
        try {
          // Configure Prism.js plugins safely
          if (typeof Prism !== 'undefined' && Prism.plugins && Prism.plugins.toolbar) {
            // Configure copy-to-clipboard plugin
            if (typeof Prism.plugins.toolbar.getButton === 'function' && 
                typeof Prism.plugins.toolbar.registerButton === 'function') {
              try {
                if (!Prism.plugins.toolbar.getButton('copy-to-clipboard')) {
                  Prism.plugins.toolbar.registerButton('copy-to-clipboard', {
                    text: 'Copy',
                    onClick: function (env: any) {
                      const code = env.code;
                      navigator.clipboard.writeText(code).then(() => {
                        this.textContent = 'Copied!';
                        setTimeout(() => {
                          this.textContent = 'Copy';
                        }, 2000);
                      }).catch(() => {
                        this.textContent = 'Failed to copy';
                        setTimeout(() => {
                          this.textContent = 'Copy';
                        }, 2000);
                      });
                    }
                  });
                }
              } catch (error) {
                console.warn('Failed to configure copy-to-clipboard button:', error);
              }
            }
          }
          
          // Process all code blocks and load languages dynamically
          const preElements = contentRef.current?.querySelectorAll('pre[class*="language-"]');
          const languagesToLoad = new Set<string>();
          
          preElements?.forEach(pre => {
            // Extract language from class
            const langClass = Array.from(pre.classList).find(cls => cls.startsWith('language-'));
            if (langClass) {
              const language = langClass.replace('language-', '');
              languagesToLoad.add(language);
            }
            
            // Add line-numbers class for line numbering
            if (!pre.classList.contains('line-numbers')) {
              pre.classList.add('line-numbers');
            }
            
            // Add toolbar class for copy button
            if (!pre.classList.contains('toolbar')) {
              pre.classList.add('toolbar');
            }
            
            // Ensure proper language detection
            const codeElement = pre.querySelector('code');
            if (codeElement && !codeElement.className.includes('language-') && langClass) {
              codeElement.className = langClass;
            }
          });
          
          // Load all required languages
          await Promise.all(Array.from(languagesToLoad).map(lang => loadLanguageIfNeeded(lang)));
          
          // Force re-highlight with all plugins
          if (typeof Prism !== 'undefined' && Prism.highlightAll) {
            Prism.highlightAll();
          }
          
        } catch (error) {
          console.error('Failed to initialize Prism.js:', error);
        }
      };
      
      // Use setTimeout to ensure DOM is ready
      const timeoutId = setTimeout(initializePrism, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [html]);



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
