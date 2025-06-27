# 🚀 KMDE - KariS Markdown Editor

> **Professional Markdown editor with modern interface and powerful features**

**🌐 Language / Ngôn ngữ:**
- [🇺🇸 English](README.md) *(current)*
- [🇻🇳 Tiếng Việt](README.vi.md)

[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.2-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0.1-646CFF.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.16-38B2AC.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## 📖 Introduction

KMDE (KariS Markdown Editor) is a modern Markdown editor built with React and TypeScript. The application provides a smooth editing experience with real-time preview, Google Docs conversion support, and many other advanced features.

## ✨ Key Features

### 🎨 **Modern Interface**
- **Dark/Light Theme**: Switch between light and dark modes
- **Resizable Panels**: Adjust panel sizes as desired
- **Responsive Design**: Optimized for all devices (Desktop, Tablet, Mobile)
- **Premium UI**: Elegant design with smooth effects

### ⚡ **Powerful Tools**
- **Monaco Editor**: Professional code editor with syntax highlighting
- **Real-time Preview**: Instant content preview
- **Auto-save**: Automatic work saving, never lose data
- **Find & Replace**: Advanced text search and replace
- **Line Numbers**: Toggleable line number display

### 🔄 **Smart Conversion**
- **Google Docs Import**: Direct conversion from Google Docs to Markdown
- **HTML to Markdown**: Support for HTML to Markdown conversion
- **Clipboard Integration**: Paste and auto-convert from clipboard
- **Table Normalization**: Automatic table format standardization

### 📤 **Diverse Export Options**
- **Markdown Export**: Export .md files
- **HTML Export**: Export HTML files with multiple themes
- **Standalone HTML**: Create standalone HTML files with embedded CSS
- **Custom Styling**: Customize themes and containers for HTML export

### 🛠️ **Editing Tools**
- **Toolbar**: Tool bar with formatting functions
- **Table Generator**: Visual table creation
- **Quick Insert**: Quick insertion of bold, italic, code, list, quote, link, image
- **Keyboard Shortcuts**: Shortcuts for common operations

### 📱 **Mobile Support**
- **Tab Switcher**: Switch between Editor and Preview on mobile
- **Touch Optimized**: Optimized for touch interactions
- **Responsive Layout**: Layout adapts to all screen sizes

## 🚀 Installation and Setup

### System Requirements
- **Node.js**: >= 18.0.0
- **pnpm**: >= 8.0.0 (recommended) or npm/yarn

### Installation

```bash
# Clone repository
git clone https://github.com/tatsuyakari1203/markdown-editor.git
cd markdown-editor

# Install dependencies
pnpm install
# or
npm install
```

### Running the Application

```bash
# Development mode
pnpm dev
# or
npm run dev

# Build for production
pnpm build
# or
npm run build

# Preview production build
pnpm preview
# or
npm run preview
```

### Available Scripts

```bash
# Run development server
pnpm dev

# Build for production
pnpm build

# Lint code
pnpm lint

# Preview production build
pnpm preview

# Run tests
pnpm test
```

## 🏗️ Technology Stack

### **Frontend Framework**
- **React 18.3.1**: Main UI library
- **TypeScript 5.6.2**: Type safety and developer experience
- **Vite 6.0.1**: Fast build tool and dev server

### **UI & Styling**
- **Tailwind CSS 3.4.16**: Utility-first CSS framework
- **Radix UI**: Accessible UI components
- **Lucide React**: Modern icon library
- **GitHub Markdown CSS**: Styling for Markdown preview

### **Editor & Markdown**
- **Monaco Editor**: Powerful code editor (VS Code engine)
- **Marked**: Markdown parser and compiler
- **Remark/Rehype**: Unified ecosystem for Markdown processing
- **React Syntax Highlighter**: Syntax highlighting for code blocks

### **Utilities & Tools**
- **React Resizable Panels**: Resizable layout panels
- **Turndown**: HTML to Markdown converter
- **HTML2Canvas**: Screenshot and export functionality
- **Date-fns**: Date manipulation utilities

### **Development Tools**
- **ESLint**: Code linting
- **Vitest**: Testing framework
- **PostCSS**: CSS processing
- **Autoprefixer**: CSS vendor prefixing

## 📁 Project Structure

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
├── package.json           # Dependencies and scripts
├── tailwind.config.js     # Tailwind configuration
├── vite.config.ts         # Vite configuration
└── tsconfig.json          # TypeScript configuration
```

## 🎯 Advanced Features

### **Google Docs Integration**
- Direct conversion from Google Docs to Markdown
- Complex formatting handling (tables, lists, styles)
- Slice clip data support for accurate conversion

### **Smart Table Processing**
- Auto-normalization of table formatting
- Column alignment detection
- Visual table generator

### **Advanced Export Options**
- Multiple HTML themes (GitHub Light/Dark, Minimal)
- Custom CSS injection
- Standalone HTML with embedded styles
- Configurable container types and classes

### **Performance Optimizations**
- Lazy loading for heavy components
- Memoization for expensive operations
- Efficient re-rendering with React.memo
- Optimized bundle splitting

## 🔧 Configuration

### **Environment Variables**
Create `.env.local` file for configuration:

```env
# API endpoints (if needed)
VITE_API_URL=your_api_url

# Feature flags
VITE_ENABLE_DEBUG=false
```

### **Customization**
- **Themes**: Modify `tailwind.config.js` for custom colors
- **Editor Settings**: Configure Monaco editor in `MarkdownEditor.tsx`
- **Export Templates**: Customize HTML templates in `ExportDialog.tsx`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request

### **Development Guidelines**
- Use TypeScript for type safety
- Follow ESLint rules
- Write tests for new features
- Update documentation when needed

## 📝 License

This project is distributed under the MIT License. See the [LICENSE](LICENSE) file for more details.

## 🙏 Acknowledgments

- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Powerful code editor
- [Radix UI](https://www.radix-ui.com/) - Accessible component primitives
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Lucide](https://lucide.dev/) - Beautiful icon library