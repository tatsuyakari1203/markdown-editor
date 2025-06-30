// src/core/contexts/DocumentContext.tsx

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { IStorageStrategy, Document } from '../strategies/IStorageStrategy';
import { LocalStorageStrategy } from '../strategies/LocalStorageStrategy';
import { normalizeTableContent } from '@/lib/table-normalizer';

// Định nghĩa các giá trị mà Context sẽ cung cấp
interface DocumentContextType {
  document: Document | null;
  updateDocumentContent: (newContent: string) => void;
  isLoading: boolean;
  isSaving: boolean;
}

// Tạo Context
const DocumentContext = createContext<DocumentContextType | null>(null);

// Tạo Provider Component
export const DocumentProvider = ({ children }: { children: React.ReactNode }) => {
  // **ĐIỂM MẤU CHỐT**: Chọn strategy ở đây. Hiện tại chỉ dùng LocalStorage.
  // Sau này, bạn có thể thay đổi logic này để chọn PocketBaseStrategy.
  const [strategy] = useState<IStorageStrategy>(() => new LocalStorageStrategy());

  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Tải tài liệu khi Provider được mount
  useEffect(() => {
    setIsLoading(true);
    strategy.getDocument().then(doc => {
      setDocument(doc);
      setIsLoading(false);
    });
  }, [strategy]);

  // Hàm để cập nhật nội dung tài liệu từ các component con
  const updateDocumentContent = useCallback((newContent: string) => {
    setDocument(prevDoc => prevDoc ? { ...prevDoc, content: newContent } : null);
  }, []);

  // Logic auto-save
  useEffect(() => {
    if (!document || isLoading) {
      return;
    }

    // Hủy timeout cũ nếu có
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Đặt timeout mới để lưu sau 1 giây
    saveTimeoutRef.current = setTimeout(() => {
      setIsSaving(true);
      // Chuẩn hóa bảng trước khi lưu
      const normalizedDoc = { ...document, content: normalizeTableContent(document.content) };
      strategy.saveDocument(normalizedDoc).finally(() => {
        setIsSaving(false);
      });
    }, 1000);

    // Cleanup timeout khi component unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [document, strategy, isLoading]);

  const value = { document, updateDocumentContent, isLoading, isSaving };

  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  );
};

// Custom hook để sử dụng Context dễ dàng hơn
export const useDocument = () => {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error('useDocument must be used within a DocumentProvider');
  }
  return context;
};