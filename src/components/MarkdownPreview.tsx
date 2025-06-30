import React, { useMemo, useRef } from 'react'
import './MarkdownPreview.css'
import 'katex/dist/katex.min.css'

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

  const previewClassName = useMemo(
    () =>
      `flex-1 p-6 pb-16 overflow-auto markdown-preview-content transition-colors duration-300 ${
        isDarkMode ? 'dark bg-transparent text-gray-100' : 'light bg-transparent text-gray-900'
      }`,
    [isDarkMode]
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div ref={previewRef} className={previewClassName}>
        {isLoading && !html ? (
          <div className="flex items-center justify-center h-full">Đang xử lý...</div>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </div>
      {/* Footer có thể giữ nguyên */}
    </div>
  );
};

export default MarkdownPreview
