import React, { useState } from 'react';
import { ClipboardPaste } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from '../hooks/use-toast';
import { useClipboardReader } from '../hooks/useClipboardReader';
import { ocrService } from '../services/ocrService';


interface SmartPasteButtonProps {
  onInsertMarkdown?: (markdown: string) => void;
  isDarkMode?: boolean;
  apiKey: string;
}

export function SmartPasteButton({ onInsertMarkdown, isDarkMode = false, apiKey }: SmartPasteButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { readClipboard } = useClipboardReader();

  const handleSmartPaste = async () => {
    if (!navigator.clipboard) {
      toast.error('Clipboard API không được hỗ trợ');
      return;
    }

    console.log('🔄 Smart Paste: Bắt đầu xử lý clipboard');
    setIsProcessing(true);
    
    try {
      console.log('📋 Smart Paste: Đang đọc clipboard...');
      // Kiểm tra xem clipboard có chứa ảnh không
      const clipboardItems = await navigator.clipboard.read();
      console.log('📋 Smart Paste: Tìm thấy', clipboardItems.length, 'items trong clipboard');
      
      for (const item of clipboardItems) {
        console.log('📋 Smart Paste: Kiểm tra item với types:', item.types);
        
        // Nếu có ảnh, sử dụng OCR
        if (item.types.some(type => type.startsWith('image/'))) {
          const imageType = item.types.find(type => type.startsWith('image/'));
          console.log('🖼️ Smart Paste: Phát hiện ảnh với type:', imageType);
          
          if (imageType) {
            console.log('🖼️ Smart Paste: Đang lấy dữ liệu ảnh...');
            const blob = await item.getType(imageType);
            console.log('🖼️ Smart Paste: Kích thước ảnh:', blob.size, 'bytes');
            
            // Chuyển đổi blob thành base64
            console.log('🔄 Smart Paste: Đang chuyển đổi ảnh sang base64...');
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve, reject) => {
              reader.onload = () => {
                console.log('✅ Smart Paste: Chuyển đổi base64 thành công');
                resolve(reader.result as string);
              };
              reader.onerror = (error) => {
                console.error('❌ Smart Paste: Lỗi chuyển đổi base64:', error);
                reject(error);
              };
              reader.readAsDataURL(blob);
            });
            
            try {
              const base64Data = await base64Promise;
              console.log('🔄 Smart Paste: Đang khởi tạo OCR service...');
              
              if (!apiKey) {
                console.error('❌ Smart Paste: Thiếu Gemini API key');
                toast.error('Vui lòng cấu hình Gemini API key trong Settings');
                setIsProcessing(false);
                return;
              }
              
              console.log('🔄 Smart Paste: Đang khởi tạo OCR service với API key...');
              // Khởi tạo OCR service với API key
              const initialized = await ocrService.ensureInitialized(apiKey);
              if (!initialized) {
                console.error('❌ Smart Paste: Không thể khởi tạo OCR service');
                toast.error('Không thể khởi tạo OCR service');
                setIsProcessing(false);
                return;
              }
              
              console.log('🤖 Smart Paste: Đang gửi ảnh đến AI để trích xuất text...');
              toast({
                title: "Đang xử lý ảnh",
                description: "Đang trích xuất text từ ảnh bằng AI..."
              });
              
              const result = await ocrService.extractTextFromImage(base64Data, {
                outputFormat: 'markdown',
                language: 'auto'
              });
              
              console.log('🤖 Smart Paste: Kết quả OCR:', result);
              
              if (result.success && result.text && onInsertMarkdown) {
                console.log('✅ Smart Paste: OCR thành công, đang chèn text vào editor');
                onInsertMarkdown(result.text);
                toast({
                  title: "Thành công",
                  description: "Đã trích xuất text từ ảnh (hỗ trợ KaTeX) và chèn vào editor"
                });
              } else {
                console.error('❌ Smart Paste: OCR thất bại:', result.error);
                toast({
                  title: "Lỗi OCR",
                  description: result.error || 'Không thể trích xuất text từ ảnh',
                  variant: "destructive"
                });
              }
            } catch (error) {
              console.error('❌ Smart Paste: Lỗi xử lý OCR:', error);
              toast({
                title: "Lỗi xử lý OCR",
                description: 'Lỗi khi xử lý OCR: ' + (error instanceof Error ? error.message : 'Unknown error'),
                variant: "destructive"
              });
            }
            
            setIsProcessing(false);
            return;
          }
        }
      }
      
      // Nếu không có ảnh, sử dụng clipboard reader cho Google Docs/HTML
      const result = await readClipboard();
      
      if (result.success && result.markdown && onInsertMarkdown) {
        onInsertMarkdown(result.markdown);
        
        // Hiển thị thông báo dựa trên nguồn
        if (result.html) {
          toast.success('Đã chuyển đổi nội dung thành Markdown');
        } else {
          toast.success('Đã dán nội dung text');
        }
      } else {
        toast.error(result.error || 'Không thể đọc nội dung clipboard');
      }
      
    } catch (error) {
      console.error('Smart paste error:', error);
      toast.error('Lỗi khi xử lý clipboard');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSmartPaste}
      disabled={isProcessing}
      className={`h-8 px-2 ${isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
      title="Smart Paste - Automatically extract text from images with KaTeX math support and paste as markdown"
    >
      {isProcessing ? (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
      ) : (
        <ClipboardPaste className="w-4 h-4" />
      )}
    </Button>
  );
}

export default SmartPasteButton;