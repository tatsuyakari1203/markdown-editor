/// <reference types="vitest" />
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import path from "path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  worker: {
    format: 'es',
    rollupOptions: {
      external: [
        // Aggressively exclude ALL potentially DOM-dependent packages
        'rehype-dom-parse',
        'hast-util-from-dom',
        'hast-util-to-dom',
        'parse5',
        'jsdom',
        'web-streams-polyfill',
        'dom-serializer',
        'domhandler',
        'htmlparser2',
        'cheerio',
        'linkedom',
        'happy-dom'
      ],
      output: {
        format: 'es',
        // Inline all dependencies to avoid external references
        inlineDynamicImports: false
      }
    }
  },
  optimizeDeps: {
    exclude: [
      // Exclude worker files from pre-bundling
      'src/workers/processor.worker.ts'
    ]
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Core React libraries
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor';
          }
          
          // Monaco Editor (large dependency)
          if (id.includes('@monaco-editor') || id.includes('monaco-editor')) {
            return 'monaco-editor';
          }
          
          // Syntax Highlighter
          if (id.includes('react-syntax-highlighter') || id.includes('highlight.js')) {
            return 'syntax-highlighter';
          }
          
          // Radix UI components
          if (id.includes('@radix-ui/react-dialog') || 
              id.includes('@radix-ui/react-dropdown-menu') ||
              id.includes('@radix-ui/react-tabs') ||
              id.includes('@radix-ui/react-toast')) {
            return 'radix-ui-core';
          }
          
          if (id.includes('@radix-ui/react-select') ||
              id.includes('@radix-ui/react-checkbox') ||
              id.includes('@radix-ui/react-radio-group')) {
            return 'radix-ui-forms';
          }
          
          if (id.includes('@radix-ui/react-popover') ||
              id.includes('@radix-ui/react-separator') ||
              id.includes('@radix-ui/react-scroll-area')) {
            return 'radix-ui-layout';
          }
          
          if (id.includes('@radix-ui/react-progress') ||
              id.includes('@radix-ui/react-label') ||
              id.includes('@radix-ui/react-slot')) {
            return 'radix-ui-misc';
          }
          
          // Markdown processing libraries
          if (id.includes('rehype-dom-parse') ||
              id.includes('rehype-remark') ||
              id.includes('remark-gfm') ||
              id.includes('remark-stringify') ||
              id.includes('unified') ||
              id.includes('hast-util-to-mdast') ||
              id.includes('unist-util-visit') ||
              id.includes('rehype-stringify') ||
              id.includes('mdast-util-to-markdown') ||
              id.includes('vfile')) {
            return 'markdown-processors';
          }
          
          // Document processing (external libraries only)
          if (id.includes('turndown') ||
              id.includes('marked') ||
              id.includes('github-slugger') ||
              id.includes('hastscript')) {
            return 'document-processors';
          }
          
          // KaTeX math rendering
          if (id.includes('katex') ||
              id.includes('rehype-katex') ||
              id.includes('remark-math')) {
            return 'katex';
          }
          
          // UI utilities and styling
          if (id.includes('clsx') ||
              id.includes('class-variance-authority') ||
              id.includes('tailwind-merge') ||
              id.includes('tailwindcss-animate') ||
              id.includes('lucide-react')) {
            return 'ui-utilities';
          }
          
          // Form and validation
          if (id.includes('zod')) {
            return 'form-libs';
          }
          
          // Additional UI components
          if (id.includes('sonner') ||
              id.includes('react-resizable-panels')) {
            return 'ui-components';
          }
          
          // Utilities and misc
          if (id.includes('github-markdown-css')) {
            return 'utilities';
          }
          
          // Google AI
          if (id.includes('@google/genai')) {
            return 'ai-services';
          }
          
          // Internal lib modules - separate to avoid circular deps
          if (id.includes('src/lib/types') ||
              id.includes('src/lib/css') ||
              id.includes('src/lib/type-guards')) {
            return 'lib-core';
          }
          
          if (id.includes('src/lib/google-html-processors')) {
            return 'lib-processors';
          }
          
          if (id.includes('src/lib/')) {
            return 'lib-utils';
          }
        }
      },
      // Tree shaking optimization
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false
      }
    },
    // Tăng chunk size warning limit
    chunkSizeWarningLimit: 500,
    // Tối ưu minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    },
    // Optimize CSS
    cssCodeSplit: true,
    // Enable source maps for production debugging (optional)
    sourcemap: false,
    // Optimize asset handling
    assetsInlineLimit: 4096
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
})

