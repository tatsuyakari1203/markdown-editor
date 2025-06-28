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
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          'react-vendor': ['react', 'react-dom'],
          
          // Monaco Editor (large dependency)
          'monaco-editor': ['@monaco-editor/react', 'monaco-editor'],
          
          // Syntax Highlighter
          'syntax-highlighter': ['react-syntax-highlighter'],
          
          // Radix UI components (split into smaller chunks)
          'radix-ui-core': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast'
          ],
          'radix-ui-forms': [
            '@radix-ui/react-select',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-switch',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-slider'
          ],
          'radix-ui-layout': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-popover',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-separator',
            '@radix-ui/react-scroll-area'
          ],
          'radix-ui-misc': [
            '@radix-ui/react-avatar',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-progress',
            '@radix-ui/react-hover-card',
            '@radix-ui/react-context-menu',
            '@radix-ui/react-menubar',
            '@radix-ui/react-navigation-menu',
            '@radix-ui/react-toggle',
            '@radix-ui/react-toggle-group',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-aspect-ratio',
            '@radix-ui/react-label',
            '@radix-ui/react-slot'
          ],
          
          // Markdown processing libraries
          'markdown-processors': [
            'rehype-dom-parse',
            'rehype-remark', 
            'remark-gfm',
            'remark-stringify',
            'unified',
            'hast-util-to-mdast',
            'unist-util-visit',
            'unist-util-visit-parents',
            'rehype-stringify',
            'mdast-util-to-markdown',
            'vfile'
          ],
          
          // Document processing
          'document-processors': [
            'turndown',
            'turndown-plugin-gfm',
            'marked',
            'github-slugger',
            'hastscript'
          ],
          
          // Canvas rendering
          'canvas-libs': [
            'html2canvas'
          ],
          
          // PDF generation
          'pdf-libs': [
            'jspdf'
          ],
          
          // UI utilities and styling
          'ui-utilities': [
            'clsx',
            'class-variance-authority',
            'tailwind-merge',
            'tailwindcss-animate',
            'lucide-react'
          ],
          
          // Form and validation
          'form-libs': [
            'react-hook-form',
            '@hookform/resolvers',
            'zod'
          ],
          
          // Additional UI components
          'ui-components': [
            'sonner',
            'cmdk',
            'vaul',
            'embla-carousel-react',
            'react-day-picker',
            'input-otp',
            'react-resizable-panels'
          ],
          
          // Utilities and misc
          'utilities': [
            'date-fns',
            'next-themes',
            'github-markdown-css'
          ],
          
          // Google AI
          'ai-services': [
            '@google/generative-ai'
          ],
          
          // Charts (if used)
          'charts': [
            'recharts'
          ]
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

