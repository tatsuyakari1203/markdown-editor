# 🚀 KMDE - KariS Markdown Editor

> **Trình soạn thảo Markdown chuyên nghiệp với giao diện hiện đại và tính năng mạnh mẽ**

**🌐 Language / Ngôn ngữ:**
- [🇺🇸 English](README.md)
- [🇻🇳 Tiếng Việt](README.vi.md) *(hiện tại)*

[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.2-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0.1-646CFF.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.16-38B2AC.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## 📖 Giới thiệu

KMDE (KariS Markdown Editor) là một trình soạn thảo Markdown hiện đại được xây dựng bằng React và TypeScript. Ứng dụng cung cấp trải nghiệm chỉnh sửa mượt mà với preview thời gian thực, hỗ trợ chuyển đổi Google Docs và nhiều tính năng nâng cao khác.

![KMDE Preview](preview.png)
*Giao diện hiện đại với hỗ trợ dark/light theme và công cụ chỉnh sửa AI*

## ✨ Tính năng chính

### 🎨 **Giao diện hiện đại**
- **Dark/Light Theme**: Chuyển đổi giữa chế độ sáng và tối
- **Resizable Panels**: Điều chỉnh kích thước panel theo ý muốn
- **Responsive Design**: Tối ưu cho mọi thiết bị (Desktop, Tablet, Mobile)
- **Premium UI**: Thiết kế tinh tế với hiệu ứng mượt mà

### ⚡ **Công cụ mạnh mẽ**
- **Monaco Editor**: Trình soạn thảo code chuyên nghiệp với syntax highlighting
- **Real-time Preview**: Xem trước nội dung ngay lập tức
- **AI-Powered Editing**: Tích hợp Gemini AI để nâng cao nội dung
- **Find & Replace**: Tìm kiếm và thay thế văn bản nâng cao
- **Line Numbers**: Hiển thị số dòng có thể bật/tắt

### 🔄 **Chuyển đổi thông minh**
- **Google Docs Import**: Chuyển đổi trực tiếp từ Google Docs sang Markdown
- **HTML to Markdown**: Hỗ trợ chuyển đổi từ HTML sang Markdown
- **Clipboard Integration**: Paste và chuyển đổi tự động từ clipboard
- **Table Normalization**: Tự động chuẩn hóa định dạng bảng

### 📤 **Xuất file đa dạng**
- **Markdown Export**: Xuất file .md
- **HTML Export**: Xuất file HTML với nhiều theme
- **Standalone HTML**: Tạo file HTML độc lập với CSS nhúng
- **Custom Styling**: Tùy chỉnh theme và container cho HTML export

### 🛠️ **Công cụ soạn thảo**
- **AI Toolbar**: Thanh công cụ AI để định dạng và viết lại nội dung
- **Smart Formatting**: Tự động định dạng và tối ưu hóa Markdown
- **Table Generator**: Tạo bảng trực quan
- **Quick Insert**: Chèn nhanh bold, italic, code, list, quote, link, image
- **Keyboard Shortcuts**: Phím tắt cho các thao tác thường dùng

### 📱 **Hỗ trợ Mobile**
- **Tab Switcher**: Chuyển đổi giữa Editor và Preview trên mobile
- **Touch Optimized**: Tối ưu cho thao tác cảm ứng
- **Responsive Layout**: Bố cục thích ứng với mọi kích thước màn hình

## 🚀 Cài đặt và Chạy

### Yêu cầu hệ thống
- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0 hoặc **pnpm**: >= 8.0.0 (khuyến nghị)

### Cài đặt

```bash
# Clone repository
git clone https://github.com/tatsuyakari1203/markdown-editor.git
cd markdown-editor

# Cài đặt dependencies
npm install
# hoặc
pnpm install
```

### Chạy ứng dụng

```bash
# Development mode
npm run dev
# hoặc
npx vite dev
# hoặc
pnpm dev

# Build production
npm run build
# hoặc
npx vite build
# hoặc
pnpm build

# Preview production build
npm run preview
# hoặc
npx vite preview
# hoặc
pnpm preview
```

### Scripts có sẵn

```bash
# Cài đặt dependencies
npm install

# Chạy development server
npm run dev
npm start          # Lệnh thay thế
npx vite dev       # Lệnh Vite trực tiếp

# Build cho production
npm run build
npx vite build     # Lệnh Vite trực tiếp

# Lint code
npm run lint

# Preview production build
npm run preview
npx vite preview   # Lệnh Vite trực tiếp

# Chạy tests
npm run test
```

## 🏗️ Công nghệ sử dụng

### **Frontend Framework**
- **React 18.3.1**: Library UI chính
- **TypeScript 5.6.2**: Type safety và developer experience
- **Vite 6.0.1**: Build tool và dev server nhanh

### **UI & Styling**
- **Tailwind CSS 3.4.16**: Utility-first CSS framework
- **Radix UI**: Accessible UI components
- **Lucide React**: Icon library hiện đại
- **GitHub Markdown CSS**: Styling cho Markdown preview

### **Editor & Markdown**
- **Monaco Editor**: Code editor mạnh mẽ (VS Code engine)
- **Marked**: Markdown parser và compiler
- **Remark/Rehype**: Unified ecosystem cho Markdown processing
- **React Syntax Highlighter**: Syntax highlighting cho code blocks

### **Utilities & Tools**
- **React Resizable Panels**: Resizable layout panels
- **Turndown**: HTML to Markdown converter
- **HTML2Canvas**: Screenshot và export functionality
- **Date-fns**: Date manipulation utilities

### **Development Tools**
- **ESLint**: Code linting
- **Vitest**: Testing framework
- **PostCSS**: CSS processing
- **Autoprefixer**: CSS vendor prefixing

## 📁 Cấu trúc dự án

```
markdown-editor/
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # Reusable UI components
│   │   ├── MarkdownEditor.tsx
│   │   ├── MarkdownPreview.tsx
│   │   ├── ClipboardConverter.tsx
│   │   ├── ExportDialog.tsx
│   │   └── ...
│   ├── hooks/              # Custom React hooks
│   │   ├── useClipboardReader.ts
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── lib/                # Utility libraries
│   │   ├── google-html-processors/  # Google Docs processing
│   │   ├── convert.ts      # Conversion utilities
│   │   ├── storage.ts      # Local storage management
│   │   └── ...
│   ├── styles/             # Global styles
│   └── App.tsx             # Main application component
├── public/                 # Static assets
├── package.json           # Dependencies và scripts
├── tailwind.config.js     # Tailwind configuration
├── vite.config.ts         # Vite configuration
└── tsconfig.json          # TypeScript configuration
```

## 🎯 Tính năng nâng cao

### **AI-Powered Content Enhancement**
- **Tích hợp Gemini AI**: Sử dụng mô hình Gemini 2.5 Flash của Google để xử lý nội dung
- **Smart Reformatting**: Tự động cải thiện cấu trúc và định dạng Markdown
- **Content Rewriting**: Viết lại nội dung với sự hỗ trợ của AI và custom prompts
- **Intelligent Suggestions**: Đề xuất cải thiện nội dung dựa trên ngữ cảnh

### **Google Docs Integration**
- Chuyển đổi trực tiếp từ Google Docs sang Markdown
- Xử lý formatting phức tạp (tables, lists, styles)
- Hỗ trợ slice clip data cho conversion chính xác

### **Smart Table Processing**
- Auto-normalization của table formatting
- Column alignment detection
- Table generator với UI trực quan

### **Advanced Export Options**
- Multiple HTML themes (GitHub Light/Dark, Minimal)
- Custom CSS injection
- Standalone HTML với embedded styles
- Configurable container types và classes

### **Performance Optimizations**
- Lazy loading cho heavy components
- Memoization cho expensive operations
- Efficient re-rendering với React.memo
- Optimized bundle splitting
- Error boundaries cho graceful error handling
- Robust error recovery và user feedback

## 🔧 Cấu hình

### **Environment Variables**
Tạo file `.env.local` để cấu hình:

```env
# API endpoints (nếu cần)
VITE_API_URL=your_api_url

# Gemini AI API Key (cho tính năng AI)
VITE_GEMINI_API_KEY=your_gemini_api_key

# Feature flags
VITE_ENABLE_DEBUG=false
```

### **Cấu hình AI**
- **Gemini API Key**: Bắt buộc cho các tính năng AI
- **Settings Dialog**: Cấu hình API key và quản lý local storage
- **Built-in Documentation**: Hệ thống trợ giúp toàn diện với keyboard shortcuts

### **Customization**
- **Themes**: Modify `tailwind.config.js` cho custom colors
- **Editor Settings**: Configure Monaco editor trong `MarkdownEditor.tsx`
- **Export Templates**: Customize HTML templates trong `ExportDialog.tsx`
- **AI Settings**: Cấu hình Gemini API key và hành vi AI
- **Storage Management**: Cấu hình local storage và quản lý dữ liệu

## 🤝 Đóng góp

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Tạo Pull Request

### **Development Guidelines**
- Sử dụng TypeScript cho type safety
- Follow ESLint rules
- Viết tests cho new features
- Update documentation khi cần

## 📝 License

Dự án này được phân phối dưới MIT License. Xem file [LICENSE](LICENSE) để biết thêm chi tiết.

## 🙏 Acknowledgments

- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Powerful code editor
- [Radix UI](https://www.radix-ui.com/) - Accessible component primitives
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Lucide](https://lucide.dev/) - Beautiful icon library
