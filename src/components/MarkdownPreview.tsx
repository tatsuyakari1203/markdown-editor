import React, { useMemo, useRef, useEffect } from 'react'
import '../styles/markdown-base.css'
import { renderMathInElement } from '../lib/katex-renderer'

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

  // Render KaTeX after HTML is updated
  useEffect(() => {
    if (html && contentRef.current) {
      // Small delay to ensure DOM is updated
      const timeoutId = setTimeout(async () => {
        try {
          await renderMathInElement(contentRef.current!);
        } catch (error) {
          console.error('Failed to render math:', error);
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
