// src/workers/types.ts

// Các loại tác vụ mà Main Thread có thể yêu cầu Worker thực hiện
export type WorkerTask =
  | 'PROCESS_MARKDOWN'
  | 'REFORMAT_AI'
  | 'REWRITE_AI'
  | 'PROCESS_CLIPBOARD'
  | 'PROCESS_OCR';

// Dữ liệu được gửi từ Main Thread đến Worker
export interface WorkerRequest {
  id: string; // ID duy nhất cho mỗi yêu cầu để theo dõi
  type: WorkerTask;
  payload: any;
}

// Dữ liệu được gửi từ Worker về Main Thread
export interface WorkerResponse {
  id: string; // ID của yêu cầu gốc
  type: WorkerTask;
  success: boolean;
  payload?: any;
  error?: string;
}