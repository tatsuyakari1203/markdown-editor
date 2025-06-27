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
          // Tách vendor libraries
          'react-vendor': ['react', 'react-dom'],
          'monaco-editor': ['@monaco-editor/react', 'monaco-editor'],
          'syntax-highlighter': ['react-syntax-highlighter'],
          'radix-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-select',
            '@radix-ui/react-accordion',
            '@radix-ui/react-popover',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-switch'
          ],
          'markdown-processors': [
            'rehype-dom-parse',
            'rehype-remark', 
            'remark-gfm',
            'remark-stringify',
            'unified',
            'hast-util-to-mdast',
            'unist-util-visit',
            'unist-util-visit-parents'
          ],
          'utilities': [
            'clsx',
            'class-variance-authority',
            'tailwind-merge',
            'date-fns',
            'zod'
          ]
        }
      }
    },
    // Tăng chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Tối ưu minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
})

