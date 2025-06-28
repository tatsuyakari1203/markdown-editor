import React, { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { 
  Upload, 
  FileImage, 
  Loader2, 
  Copy, 
  Download, 
  Trash2, 
  Eye, 
  Settings,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { ocrService, OCROptions, OCRResponse } from '../services/ocrService';
import { getSettings } from '../lib-ui/settings';

interface OCRDialogProps {
  onTextExtracted?: (text: string) => void;
}

interface ImageFile {
  file: File;
  preview: string;
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: OCRResponse;
}

export function OCRDialog({ onTextExtracted }: OCRDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const [progress, setProgress] = useState(0);
  const [ocrOptions, setOcrOptions] = useState<OCROptions>({
    preserveFormatting: true,
    extractTables: false,
    language: 'auto',
    outputFormat: 'plain'
  });
  const [selectedTab, setSelectedTab] = useState('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      toast.error('Vui lòng chọn file hình ảnh hợp lệ');
      return;
    }

    const newImages: ImageFile[] = imageFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending'
    }));

    setImages(prev => [...prev, ...newImages]);
    
    if (imageFiles.length > 0) {
      setSelectedTab('preview');
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      toast.error('Vui lòng thả file hình ảnh hợp lệ');
      return;
    }

    const newImages: ImageFile[] = imageFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending'
    }));

    setImages(prev => [...prev, ...newImages]);
    setSelectedTab('preview');
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const updated = prev.filter(img => img.id !== id);
      // Cleanup object URL
      const imageToRemove = prev.find(img => img.id === id);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview);
      }
      return updated;
    });
  };

  const processImages = async () => {
    if (images.length === 0) {
      toast.error('Vui lòng chọn ít nhất một hình ảnh');
      return;
    }

    const settings = getSettings();
    if (!settings.geminiApiKey) {
      toast.error('Vui lòng cấu hình Gemini API key trong Settings');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    
    try {
      // Khởi tạo OCR service
      const initialized = await ocrService.ensureInitialized(settings.geminiApiKey);
      if (!initialized) {
        throw new Error('Không thể khởi tạo OCR service');
      }

      const totalImages = images.length;
      let processedCount = 0;
      const results: string[] = [];

      // Xử lý từng hình ảnh
      for (const image of images) {
        try {
          // Cập nhật trạng thái
          setImages(prev => prev.map(img => 
            img.id === image.id ? { ...img, status: 'processing' } : img
          ));

          const result = await ocrService.extractTextFromImage(image.file, ocrOptions);
          
          // Cập nhật kết quả
          setImages(prev => prev.map(img => 
            img.id === image.id ? { 
              ...img, 
              status: result.success ? 'completed' : 'error',
              result 
            } : img
          ));

          if (result.success && result.text.trim()) {
            results.push(result.text);
          }

          processedCount++;
          setProgress((processedCount / totalImages) * 100);

        } catch (error) {
          console.error(`Error processing image ${image.id}:`, error);
          setImages(prev => prev.map(img => 
            img.id === image.id ? { 
              ...img, 
              status: 'error',
              result: {
                success: false,
                text: '',
                error: error instanceof Error ? error.message : 'Unknown error'
              }
            } : img
          ));
          processedCount++;
          setProgress((processedCount / totalImages) * 100);
        }
      }

      // Kết hợp kết quả
      const combinedText = results.join('\n\n');
      setExtractedText(combinedText);
      
      if (combinedText.trim()) {
        setSelectedTab('result');
        toast.success(`Đã trích xuất văn bản từ ${results.length}/${totalImages} hình ảnh`);
      } else {
        toast.warning('Không tìm thấy văn bản trong các hình ảnh');
      }

    } catch (error) {
      console.error('OCR processing error:', error);
      toast.error(error instanceof Error ? error.message : 'Lỗi xử lý OCR');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(extractedText);
      toast.success('Đã sao chép văn bản');
    } catch (error) {
      toast.error('Không thể sao chép văn bản');
    }
  };

  const insertToEditor = () => {
    if (onTextExtracted && extractedText.trim()) {
      onTextExtracted(extractedText);
      setIsOpen(false);
      toast.success('Đã chèn văn bản vào editor');
    }
  };

  const downloadText = () => {
    const blob = new Blob([extractedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'extracted-text.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Đã tải xuống văn bản');
  };

  const clearAll = () => {
    // Cleanup object URLs
    images.forEach(img => URL.revokeObjectURL(img.preview));
    setImages([]);
    setExtractedText('');
    setProgress(0);
    setSelectedTab('upload');
  };

  const getStatusIcon = (status: ImageFile['status']) => {
    switch (status) {
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileImage className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: ImageFile['status']) => {
    switch (status) {
      case 'processing':
        return <Badge variant="secondary">Đang xử lý</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Hoàn thành</Badge>;
      case 'error':
        return <Badge variant="destructive">Lỗi</Badge>;
      default:
        return <Badge variant="outline">Chờ xử lý</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ImageIcon className="h-4 w-4 mr-2" />
          OCR
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Trích xuất văn bản từ hình ảnh (OCR)
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="preview" disabled={images.length === 0}>
              Xem trước ({images.length})
            </TabsTrigger>
            <TabsTrigger value="settings">Cài đặt</TabsTrigger>
            <TabsTrigger value="result" disabled={!extractedText}>
              Kết quả
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Chọn hình ảnh</CardTitle>
                <CardDescription>
                  Hỗ trợ các định dạng: JPG, PNG, GIF, WebP. Có thể chọn nhiều file cùng lúc.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2">Kéo thả hình ảnh vào đây</p>
                  <p className="text-sm text-gray-500 mb-4">hoặc nhấp để chọn file</p>
                  <Button variant="outline">
                    <FileImage className="h-4 w-4 mr-2" />
                    Chọn hình ảnh
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Hình ảnh đã chọn ({images.length})</h3>
              <div className="flex gap-2">
                <Button 
                  onClick={processImages} 
                  disabled={isProcessing || images.length === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Trích xuất văn bản
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={clearAll}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Xóa tất cả
                </Button>
              </div>
            </div>
            
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Tiến độ xử lý</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            )}

            <ScrollArea className="h-96">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {images.map((image) => (
                  <Card key={image.id} className="overflow-hidden">
                    <div className="relative">
                      <img
                        src={image.preview}
                        alt="Preview"
                        className="w-full h-48 object-cover"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => removeImage(image.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium truncate">
                          {image.file.name}
                        </span>
                        {getStatusIcon(image.status)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {(image.file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                        {getStatusBadge(image.status)}
                      </div>
                      {image.result?.error && (
                        <Alert className="mt-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            {image.result.error}
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Cài đặt OCR
                </CardTitle>
                <CardDescription>
                  Tùy chỉnh cách trích xuất văn bản từ hình ảnh
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="language">Ngôn ngữ</Label>
                  <Select 
                    value={ocrOptions.language} 
                    onValueChange={(value) => setOcrOptions(prev => ({ ...prev, language: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Tự động phát hiện</SelectItem>
                      <SelectItem value="Vietnamese">Tiếng Việt</SelectItem>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Chinese">中文</SelectItem>
                      <SelectItem value="Japanese">日本語</SelectItem>
                      <SelectItem value="Korean">한국어</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="outputFormat">Định dạng đầu ra</Label>
                  <Select 
                    value={ocrOptions.outputFormat} 
                    onValueChange={(value: 'plain' | 'markdown' | 'structured') => 
                      setOcrOptions(prev => ({ ...prev, outputFormat: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="plain">Văn bản thuần</SelectItem>
                      <SelectItem value="markdown">Markdown</SelectItem>
                      <SelectItem value="structured">Có cấu trúc</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="preserveFormatting"
                      checked={ocrOptions.preserveFormatting}
                      onCheckedChange={(checked) => 
                        setOcrOptions(prev => ({ ...prev, preserveFormatting: !!checked }))
                      }
                    />
                    <Label htmlFor="preserveFormatting" className="text-sm">
                      Giữ nguyên định dạng gốc
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="extractTables"
                      checked={ocrOptions.extractTables}
                      onCheckedChange={(checked) => 
                        setOcrOptions(prev => ({ ...prev, extractTables: !!checked }))
                      }
                    />
                    <Label htmlFor="extractTables" className="text-sm">
                      Trích xuất bảng biểu
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="result" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Văn bản đã trích xuất</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyToClipboard}>
                  <Copy className="h-4 w-4 mr-2" />
                  Sao chép
                </Button>
                <Button variant="outline" size="sm" onClick={downloadText}>
                  <Download className="h-4 w-4 mr-2" />
                  Tải xuống
                </Button>
                {onTextExtracted && (
                  <Button size="sm" onClick={insertToEditor}>
                    Chèn vào Editor
                  </Button>
                )}
              </div>
            </div>
            
            <Card>
              <CardContent className="p-0">
                <Textarea
                  value={extractedText}
                  onChange={(e) => setExtractedText(e.target.value)}
                  placeholder="Văn bản trích xuất sẽ hiển thị ở đây..."
                  className="min-h-96 border-0 resize-none"
                />
              </CardContent>
            </Card>
            
            {extractedText && (
              <div className="text-sm text-gray-500">
                Số ký tự: {extractedText.length} | Số từ: {extractedText.split(/\s+/).filter(word => word.length > 0).length}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}