import React, { useRef, useEffect, useMemo } from 'react';
import Prism from 'prismjs';
import 'prismjs/plugins/line-numbers/prism-line-numbers';
import 'prismjs/components/prism-json'; // Example: load additional languages
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import '../styles/markdown-base.css'
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

  // Initialize code copy after HTML is updated
  useEffect(() => {
    if (html && contentRef.current) {
      const timeoutId = setTimeout(() => {
        try {
          initializeCodeCopy();
          Prism.highlightAll();
        } catch (error) {
          console.error('Failed to initialize code copy or highlight:', error);
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
