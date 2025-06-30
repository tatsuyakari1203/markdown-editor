// src/core/strategies/IStorageStrategy.ts

/**
 * Định nghĩa cấu trúc dữ liệu cho một tài liệu.
 */
export interface Document {
  id: string | null; // ID có thể là 'local' hoặc ID từ database
  title: string;
  content: string;
  // Có thể mở rộng với các trường khác như `createdAt`, `updatedAt` sau này
}

/**
 * Interface định nghĩa các hành động bắt buộc cho một chiến lược lưu trữ.
 */
export interface IStorageStrategy {
  /**
   * Lấy tài liệu hiện tại để hiển thị trong editor.
   */
  getDocument(documentId?: string): Promise<Document>;

  /**
   * Lưu nội dung tài liệu.
   */
  saveDocument(document: Document): Promise<string | null>; // Trả về ID của tài liệu đã lưu

  /**
   * (Dành cho tính năng collab sau này)
   * Lắng nghe các thay đổi từ nguồn dữ liệu bên ngoài.
   * @param callback Hàm sẽ được gọi khi có nội dung mới.
   * @returns Một hàm để dọn dẹp (unsubscribe).
   */
  onUpdate(callback: (newContent: string) => void): () => void;
}