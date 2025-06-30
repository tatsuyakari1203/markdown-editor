import React, { useRef, useEffect, useMemo } from 'react'
import '../styles/markdown-base.css'
import { renderMathInElement } from '../lib/katex-renderer'
import { initializeCodeCopy } from '../lib/code-copy'

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

  // Render KaTeX and initialize code copy after HTML is updated
  useEffect(() => {
    if (html && contentRef.current) {
      // Small delay to ensure DOM is updated
      const timeoutId = setTimeout(async () => {
        try {
          // Render KaTeX math
          await renderMathInElement(contentRef.current!);
          
          // Initialize Prism.js and code features
          const initializeCodeFeatures = () => {
            // Add line-numbers class to pre elements for Prism.js
            const preElements = contentRef.current!.querySelectorAll('pre');
            preElements.forEach((pre) => {
              const codeElement = pre.querySelector('code');
              if (codeElement) {
                // Add line-numbers class for Prism.js line numbers plugin
                pre.classList.add('line-numbers');
              }
            });
            
            // Initialize code copy functionality
            initializeCodeCopy();
          };
          
          // Load Prism.js if not already loaded
          if (typeof window !== 'undefined' && (window as any).Prism) {
            initializeCodeFeatures();
            (window as any).Prism.highlightAll();
          } else {
            // Load Prism.js core and plugins
            const loadPrismScript = (src: string) => {
              return new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = src;
                script.onload = resolve;
                document.head.appendChild(script);
              });
            };
            
            // Load Prism.js core first, then plugins
            loadPrismScript('https://cdnjs.cloudflare.com/ajax/libs/prism/1.30.0/prism.min.js')
              .then(() => loadPrismScript('https://cdnjs.cloudflare.com/ajax/libs/prism/1.30.0/plugins/line-numbers/prism-line-numbers.min.js'))
              .then(() => loadPrismScript('https://cdnjs.cloudflare.com/ajax/libs/prism/1.30.0/plugins/autoloader/prism-autoloader.min.js'))
              .then(() => {
                if ((window as any).Prism) {
                  initializeCodeFeatures();
                  (window as any).Prism.highlightAll();
                }
              });
          }
        } catch (error) {
          console.error('Failed to render math or initialize code copy:', error);
        }
      }, 100);
      
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
