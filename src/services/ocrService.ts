import { GoogleGenAI } from '@google/genai';

export interface OCRConfig {
  apiKey: string;
  model?: string;
}

export interface OCRResponse {
  success: boolean;
  text: string;
  error?: string;
}

export interface OCROptions {
  preserveFormatting?: boolean;
  extractTables?: boolean;
  language?: string;
  outputFormat?: 'plain' | 'markdown' | 'structured';
}

class OCRService {
  private genAI: GoogleGenAI | null = null;
  private apiKey: string = '';
  private modelName: string = '';
  private isInitializing: boolean = false;
  private lastError: string | null = null;
  private initializationPromise: Promise<boolean> | null = null;

  initialize(config: OCRConfig): boolean {
    try {
      this.genAI = new GoogleGenAI({ apiKey: config.apiKey });
      this.apiKey = config.apiKey;
      // Sử dụng Gemini 2.5 Flash model cho OCR với khả năng multimodal
      this.modelName = config.model || 'gemini-2.5-flash';
      this.lastError = null;
      return true;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Unknown initialization error';
      console.error('OCR Service initialization failed:', error);
      return false;
    }
  }

  async ensureInitialized(apiKey: string): Promise<boolean> {
    // If already initialized with the same API key, return true
    if (this.isInitialized() && this.apiKey === apiKey) {
      return true;
    }
    
    // If different API key, reset and reinitialize
    if (this.apiKey !== apiKey) {
      this.reset();
    }
    
    // If there's an ongoing initialization, wait for it
    if (this.initializationPromise) {
      return await this.initializationPromise;
    }
    
    // Start new initialization
    this.initializationPromise = this.performInitialization(apiKey);
    
    try {
      const result = await this.initializationPromise;
      return result;
    } finally {
      this.initializationPromise = null;
    }
  }

  private async performInitialization(apiKey: string): Promise<boolean> {
    this.isInitializing = true;
    try {
      console.log('🔄 Starting OCR service initialization...');
      const result = await this.initializeWithRetry({ apiKey });
      if (result) {
        console.log('✅ OCR service initialized successfully');
      } else {
        console.error('❌ OCR service initialization failed');
      }
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
      this.lastError = errorMessage;
      console.error('❌ OCR service initialization failed:', errorMessage);
      console.error('Full error:', error);
      return false;
    } finally {
      this.isInitializing = false;
    }
  }

  private reset(): void {
    this.genAI = null;
    this.apiKey = '';
    this.modelName = '';
    this.lastError = null;
    this.initializationPromise = null;
  }

  async initializeWithRetry(config: OCRConfig, maxRetries: number = 3): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      if (this.initialize(config)) {
        return true;
      }
      
      if (i < maxRetries - 1) {
        console.log(`Initialization attempt ${i + 1} failed, retrying in ${(i + 1) * 1000}ms...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    return false;
  }

  getLastError(): string | null {
    return this.lastError;
  }

  /**
   * Trích xuất văn bản từ hình ảnh sử dụng Gemma 3 27B model
   * @param imageData - Base64 encoded image data hoặc File object
   * @param options - Tùy chọn OCR
   * @returns Promise<OCRResponse>
   */
  async extractTextFromImage(imageData: string | File, options: OCROptions = {}): Promise<OCRResponse> {
    if (!this.genAI) {
      console.error('❌ OCR failed: Service not initialized');
      return {
        success: false,
        text: '',
        error: 'OCR service not initialized. Please check your API key.'
      };
    }

    try {
      console.log('🔄 Starting OCR text extraction...');
      
      // Chuẩn bị image data
      let imageBase64: string;
      let mimeType: string = 'image/jpeg';
      
      if (typeof imageData === 'string') {
        // Nếu là base64 string
        imageBase64 = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
        const mimeMatch = imageData.match(/^data:(image\/[a-z]+);base64,/);
        if (mimeMatch) {
          mimeType = mimeMatch[1];
        }
      } else {
        // Nếu là File object
        imageBase64 = await this.fileToBase64(imageData);
        mimeType = imageData.type || 'image/jpeg';
      }

      // Tạo prompt dựa trên options
      const prompt = this.buildOCRPrompt(options);

      const response = await this.genAI.models.generateContent({
        model: this.modelName,
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: imageBase64
                }
              }
            ]
          }
        ],
        config: {
          temperature: 0.1, // Thấp để có kết quả chính xác
          topK: 1,
          topP: 0.8,
          maxOutputTokens: 8192,
        }
      });

      const extractedText = response.text.trim();
      
      // Làm sạch kết quả nếu cần
      const cleanText = this.cleanOCRResult(extractedText, options);

      console.log('✅ OCR text extraction completed successfully');
      return {
        success: true,
        text: cleanText
      };
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to extract text from image';
      console.error('❌ OCR failed:', errorMessage);
      console.error('Full error:', error);
      return {
        success: false,
        text: '',
        error: errorMessage
      };
    }
  }

  /**
   * Xây dựng prompt cho OCR dựa trên options
   */
  private buildOCRPrompt(options: OCROptions): string {
    const {
      preserveFormatting = true,
      extractTables = false,
      language = 'auto',
      outputFormat = 'plain'
    } = options;

    let prompt = `You are an expert OCR (Optical Character Recognition) system with specialized knowledge in mathematical notation and LaTeX/KaTeX syntax. Your task is to extract text from the provided image with high accuracy.`;

    // Thêm hướng dẫn về ngôn ngữ
    if (language !== 'auto') {
      prompt += ` The text is primarily in ${language}.`;
    } else {
      prompt += ` Detect the language automatically and extract text accordingly.`;
    }

    // Thêm hướng dẫn về định dạng
    if (preserveFormatting) {
      prompt += ` Preserve the original formatting, layout, line breaks, and spacing as much as possible.`;
    }

    // Thêm hướng dẫn về bảng
    if (extractTables) {
      prompt += ` If the image contains tables, extract them and format as structured data.`;
    }

    // Thêm hướng dẫn về output format
    switch (outputFormat) {
      case 'markdown':
        prompt += ` Format the output as clean Markdown, using appropriate headers, lists, and formatting. For mathematical expressions, use KaTeX/LaTeX syntax with proper delimiters.`;
        break;
      case 'structured':
        prompt += ` Organize the output in a structured format with clear sections and hierarchy.`;
        break;
      default:
        prompt += ` Output the text in plain format.`;
    }

    prompt += `\n\nIMPORTANT RULES:
1. Extract ONLY the text visible in the image
2. Do not add interpretations, explanations, or commentary
3. Maintain accuracy - if text is unclear, indicate with [unclear]
4. Preserve special characters, numbers, and symbols
5. If no text is found, respond with "No text detected"
6. Do not include any introductory phrases or conclusions
7. MATHEMATICAL EXPRESSIONS: If you detect mathematical formulas, equations, or symbols:
   - Use proper KaTeX/LaTeX syntax
   - Inline math: wrap with $...$ (single dollar signs)
   - Display math: wrap with $$...$$ (double dollar signs)
   - Common symbols: \\alpha, \\beta, \\gamma, \\sum, \\int, \\frac{a}{b}, \\sqrt{x}, x^2, x_1, etc.
   - Matrices: use \\begin{matrix}...\\end{matrix} or \\begin{pmatrix}...\\end{pmatrix}
   - Examples: $E = mc^2$, $$\\int_0^\\infty e^{-x} dx = 1$$, $\\frac{\\partial f}{\\partial x}$

Extracted text:`;

    return prompt;
  }

  /**
   * Làm sạch kết quả OCR
   */
  private cleanOCRResult(text: string, options: OCROptions): string {
    let cleanText = text;

    // Loại bỏ các cụm từ giới thiệu thường gặp
    const introPatterns = [
      /^(Here is the extracted text|The text in the image is|Extracted text|Text from image):\s*/i,
      /^(I can see the following text|The image contains|This image shows).*?:\s*/i,
      /^(Based on the image|From the image|In the image).*?:\s*/i
    ];

    introPatterns.forEach(pattern => {
      cleanText = cleanText.replace(pattern, '');
    });

    // Loại bỏ markdown code blocks nếu không cần thiết
    if (options.outputFormat !== 'markdown') {
      cleanText = cleanText.replace(/^```[\w]*\n/, '').replace(/\n```$/, '');
    }

    return cleanText.trim();
  }

  /**
   * Chuyển đổi File object thành base64 string
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1]; // Loại bỏ data:image/...;base64,
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Trích xuất văn bản từ nhiều hình ảnh
   */
  async extractTextFromMultipleImages(images: (string | File)[], options: OCROptions = {}): Promise<OCRResponse[]> {
    const results: OCRResponse[] = [];
    
    for (const image of images) {
      const result = await this.extractTextFromImage(image, options);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Trích xuất và kết hợp văn bản từ nhiều hình ảnh thành một document
   */
  async extractAndCombineText(images: (string | File)[], options: OCROptions = {}): Promise<OCRResponse> {
    try {
      const results = await this.extractTextFromMultipleImages(images, options);
      
      const successfulResults = results.filter(r => r.success);
      const failedResults = results.filter(r => !r.success);
      
      if (successfulResults.length === 0) {
        return {
          success: false,
          text: '',
          error: 'Failed to extract text from any image'
        };
      }
      
      const combinedText = successfulResults.map(r => r.text).join('\n\n');
      
      let error: string | undefined;
      if (failedResults.length > 0) {
        error = `Successfully processed ${successfulResults.length}/${results.length} images. ${failedResults.length} failed.`;
      }
      
      return {
        success: true,
        text: combinedText,
        error
      };
    } catch (error: any) {
      return {
        success: false,
        text: '',
        error: error.message || 'Failed to process multiple images'
      };
    }
  }

  isInitialized(): boolean {
    return this.genAI !== null;
  }
}

export const ocrService = new OCRService();
export default ocrService;