### **Hướng Dẫn Phát Triển Chi Tiết: Premium Markdown Editor**

Chào bạn, đây là lộ trình chi tiết để bạn có thể nâng cấp dự án của mình một cách có hệ thống và hiệu quả. Chúng tôi sẽ chia thành 3 giai đoạn chính.


### **Giai Đoạn 1: Hoàn Thiện Tính Năng "Chuyển Đổi Từ Clipboard" (Ưu Tiên #1)**

Đây là tính năng quan trọng nhất được đề cập trong `todo.md` và sẽ mang lại giá trị lớn cho người dùng. Chúng ta sẽ tích hợp nó vào giao diện hiện có.


#### **Bước 1.1: Thêm Nút Kích Hoạt & Quản Lý Trạng Thái Dialog**

Đầu tiên, chúng ta cần một nút trên thanh công cụ để người dùng có thể mở Dialog chuyển đổi.

1. **Mở tệp `src/App.tsx`:** Thêm một state để quản lý việc đóng/mở của Dialog `ClipboardConverter`.

       // src/App.tsx
       import { useState } from 'react';
       // ... các import khác
       import { ClipboardConverter } from './components/ClipboardConverter'; // Thêm import này

       function App() {
         const [value, setValue] = useState(initialValue);
         // ... các state khác
         const [isConverterOpen, setIsConverterOpen] = useState(false); // <--- THÊM STATE NÀY

         // ... các hàm khác

         const handleInsertFromConverter = (markdown: string) => {
           setValue((prevValue) => `${prevValue}\n\n${markdown}`);
           setIsConverterOpen(false);
         };

         return (
           // ...
           <Toolbar
               // ... các props khác
               onOpenConverter={() => setIsConverterOpen(true)} // <--- TRUYỀN HÀM NÀY
           />
           // ...
           <ClipboardConverter
               isOpen={isConverterOpen}
               onOpenChange={setIsConverterOpen}
               onInsert={handleInsertFromConverter} // <--- TRUYỀN HÀM NÀY
           />
           // ...
         );
       }

       export default App;

2. **Mở tệp `src/components/Toolbar.tsx`:** Thêm nút "Paste from Rich Text" vào thanh công cụ.

       // src/components/Toolbar.tsx
       import {
         // ... các icon khác
         ClipboardPaste, // <--- THÊM ICON NÀY
       } from 'lucide-react';
       // ...

       // Thêm prop onOpenConverter vào interface
       interface ToolbarProps {
         // ... các props khác
         onOpenConverter: () => void;
       }

       export function Toolbar({ /*...,*/ onOpenConverter }: ToolbarProps) {
         return (
           <div className="flex flex-wrap items-center justify-start gap-1 p-2 border-b bg-background">
               {/* ... các nút khác */}

               {/* THÊM NÚT MỚI Ở ĐÂY */}
               <TooltipProvider>
                 <Tooltip>
                   <TooltipTrigger asChild>
                     <Button variant="ghost" size="icon" onClick={onOpenConverter}>
                       <ClipboardPaste className="w-4 h-4" />
                       <span className="sr-only">Paste from Rich Text</span>
                     </Button>
                   </TooltipTrigger>
                   <TooltipContent>
                     <p>Paste from Rich Text (Word, Docs...)</p>
                   </TooltipContent>
                 </Tooltip>
               </TooltipProvider>

               {/* ... phần còn lại của Toolbar */}
           </div>
         );
       }


#### **Bước 1.2: Hoàn Thiện Logic và Giao Diện `ClipboardConverter`**

Bây giờ chúng ta sẽ cập nhật component `ClipboardConverter` để nó thực sự hoạt động.

**Mở tệp `src/components/ClipboardConverter.tsx`:** Chỉnh sửa lại component để xử lý việc đọc clipboard, hiển thị kết quả và chèn vào trình soạn thảo.

    // src/components/ClipboardConverter.tsx

    import React, { useState, useCallback } from 'react';
    import { useClipboardReader } from '@/hooks/useClipboardReader';
    import { Button } from '@/components/ui/button';
    import {
      Dialog,
      DialogContent,
      DialogHeader,
      DialogTitle,
      DialogFooter,
      DialogDescription,
    } from '@/components/ui/dialog';
    import { Textarea } from './ui/textarea';
    import { useToast } from '@/hooks/use-toast';
    import { ScrollArea } from './ui/scroll-area';

    interface ClipboardConverterProps {
      isOpen: boolean;
      onOpenChange: (isOpen: boolean) => void;
      onInsert: (markdown: string) => void;
    }

    export function ClipboardConverter({ isOpen, onOpenChange, onInsert }: ClipboardConverterProps) {
      const [markdown, setMarkdown] = useState('');
      const { readFromClipboard, error, isLoading } = useClipboardReader();
      const { toast } = useToast();

      const handlePasteAndConvert = useCallback(async () => {
        const convertedMarkdown = await readFromClipboard();
        if (convertedMarkdown) {
          setMarkdown(convertedMarkdown);
          toast({
            title: 'Success!',
            description: 'Content has been converted to Markdown.',
          });
        } else if (error) {
          toast({
            title: 'Error',
            description: error,
            variant: 'destructive',
          });
        }
      }, [readFromClipboard, error, toast]);

      const handleInsert = () => {
        if (markdown.trim()) {
          onInsert(markdown);
          handleClose();
        } else {
          toast({
            title: 'Nothing to insert',
            description: 'Please convert some content first.',
            variant: 'destructive',
          });
        }
      };

      const handleClear = () => {
        setMarkdown('');
      };

      const handleClose = () => {
        onOpenChange(false);
        // Delay clearing markdown to avoid UI flickering
        setTimeout(() => {
            setMarkdown('');
        }, 300);
      };

      return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>Convert Rich Text to Markdown</DialogTitle>
              <DialogDescription>
                Paste rich text content (from web pages, Google Docs, Word) and convert it to clean Markdown.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Button onClick={handlePasteAndConvert} disabled={isLoading}>
                {isLoading ? 'Processing...' : 'Paste & Convert from Clipboard'}
              </Button>

              <ScrollArea className="h-72 w-full rounded-md border p-4">
                <pre><code>{markdown || 'Converted Markdown will appear here...'}</code></pre>
              </ScrollArea>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClear}>
                Clear
              </Button>
              <Button onClick={handleInsert} disabled={!markdown.trim()}>
                Insert into Editor
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    }

Với các bước trên, bạn đã hoàn thành tính năng chuyển đổi từ clipboard. Hãy chạy thử dự án và trải nghiệm!


### **Giai Đoạn 2: Nâng Cao Chất Lượng & Bảo Trì**

Sau khi có tính năng mới, việc đảm bảo chất lượng là cực kỳ quan trọng.


#### **Bước 2.1: Cài Đặt và Cấu Hình Vitest**

Chúng ta sẽ dùng Vitest vì nó tích hợp hoàn hảo với Vite.

1. **Cài đặt các gói cần thiết:**

       pnpm add -D vitest jsdom @testing-library/react

2. **Cập nhật `vite.config.ts`:** Thêm cấu hình `test` vào file config.

       // vite.config.ts
       /// <reference types="vitest" />
       import { defineConfig } from 'vite'
       import path from "path"
       import react from '@vitejs/plugin-react'

       export default defineConfig({
         plugins: [react()],
         resolve: {
           alias: {
             "@": path.resolve(__dirname, "./src"),
           },
         },
         test: { // <--- THÊM KHỐI NÀY
           globals: true,
           environment: 'jsdom',
           setupFiles: './src/tests/setup.ts', // (tùy chọn, nếu bạn cần file setup)
         },
       })

3. **Cập nhật `tsconfig.json`:** Thêm `vitest/globals` vào `types`.

       // tsconfig.json
       {
         "compilerOptions": {
           // ...
           "types": ["vite/client", "vitest/globals"] // <--- THÊM "vitest/globals"
         },
         // ...
       }


#### **Bước 2.2: Viết Unit Test Đầu Tiên**

Hãy bắt đầu bằng cách viết một bài test đơn giản cho một hàm tiện ích.

1. **Tạo file test:** Tạo một file mới tại `src/lib/utils.test.ts`.

2. **Viết nội dung test:**

       // src/lib/utils.test.ts
       import { describe, it, expect } from 'vitest';
       import { cn, formatDate } from './utils'; // giả sử bạn có hàm formatDate

       describe('cn function', () => {
         it('should merge tailwind classes correctly', () => {
           expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white');
           expect(cn('p-4', { 'm-2': true, 'rounded-lg': false })).toBe('p-4 m-2');
         });
       });

       describe('formatDate function', () => {
           it('should format a date object into a readable string', () => {
               const date = new Date('2023-10-27T10:00:00Z');
               const formatted = formatDate(date);
               // Kết quả có thể khác nhau tùy vào múi giờ, nhưng đây là một ví dụ
               // Bạn có thể cần mock múi giờ để test được nhất quán
               expect(formatted).toContain('October 27, 2023');
           });
       });

3. **Chạy test:** Thêm script vào `package.json`:

       "scripts": {
         "dev": "vite",
         "build": "tsc && vite build",
         "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
         "preview": "vite preview",
         "test": "vitest" // <--- THÊM SCRIPT NÀY
       },

   Bây giờ bạn có thể chạy `pnpm test` trong terminal.
