// src/core/strategies/LocalStorageStrategy.ts

import { IStorageStrategy, Document } from './IStorageStrategy';
import { getMarkdownContent, setMarkdownContent } from '@/lib/storage';
import templateMarkdown from '@/template.md?raw';

/**
 * Chiến lược lưu trữ sử dụng localStorage của trình duyệt.
 * Hoạt động hoàn toàn phía client, phù hợp cho "Community Edition".
 */
export class LocalStorageStrategy implements IStorageStrategy {
  async getDocument(): Promise<Document> {
    // Lấy nội dung từ localStorage hoặc dùng template mặc định
    const content = getMarkdownContent() || templateMarkdown;
    // Trả về một đối tượng Document với ID tĩnh là 'local'
    return { id: 'local', title: 'Local Document', content };
  }

  async saveDocument(document: Document): Promise<string | null> {
    // Lưu nội dung vào localStorage
    setMarkdownContent(document.content);
    return document.id;
  }

  onUpdate(callback: (newContent: string) => void): () => void {
    // localStorage không có cơ chế lắng nghe thay đổi real-time giữa các tab một cách đáng tin cậy.
    // Chúng ta sẽ để trống hàm này.
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'markdown-editor-content' && event.newValue) {
        callback(event.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Trả về hàm cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }
}