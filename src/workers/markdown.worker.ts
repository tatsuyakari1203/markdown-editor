// New Markdown Engine Worker - Worker-safe implementation
// Supports full markdown features and KaTeX without DOM dependencies

import type { WorkerRequest, WorkerResponse } from './types';

console.log('🚀 New Markdown Engine Worker starting...');
console.log('Worker environment:', typeof self, typeof window, typeof document);

// Simple markdown processor without problematic dependencies
class MarkdownEngine {
  private initialized = false;

  async initialize() {
    if (this.initialized) return;

    try {
      console.log('📦 Initializing simple markdown processor...');
      this.initialized = true;
      console.log('✅ Markdown engine initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize markdown engine:', error);
      throw error;
    }
  }

  private sanitizeHtml(html: string): string {
    // Basic HTML sanitization - remove dangerous tags and attributes
    // Remove script tags
    html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    
    // Remove dangerous event handlers
    html = html.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
    
    // Remove javascript: protocols
    html = html.replace(/javascript:/gi, '');
    
    // Remove data: protocols except for images
    html = html.replace(/(?<!src\s*=\s*["'])data:/gi, '');
    
    return html;
  }

  async processMarkdown(markdown: string): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      console.log('📝 Processing markdown content...');
      
      if (!markdown || typeof markdown !== 'string') {
        return '<p>No content provided</p>';
      }

      // Use marked library for simple, worker-safe processing
      const { marked } = await import('marked');
      
      // Configure marked for worker safety
      marked.setOptions({
        breaks: true,
        gfm: true,
        sanitize: false, // We'll sanitize manually
        smartLists: true,
        smartypants: false
      });

      let html = marked(markdown);

      // Post-process for enhanced features
      html = this.enhanceHtml(html);
      html = this.addKaTeXSupport(html);
      html = this.addCodeHighlighting(html);
      html = this.addTableEnhancements(html);
      html = this.sanitizeHtml(html);

      console.log('✅ Markdown processing completed');
      return html;
    } catch (error) {
      console.error('❌ Markdown processing failed:', error);
      return `<div class="error">Error processing markdown: ${error.message}</div>`;
    }
  }

  private enhanceHtml(html: string): string {
    // Add heading anchors
    html = html.replace(
      /<h([1-6])([^>]*)>([^<]+)<\/h[1-6]>/g,
      (match, level, attrs, content) => {
        const id = content.toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .trim();
        return `<h${level}${attrs} id="${id}">${content}</h${level}>`;
      }
    );

    // Enhance blockquotes
    html = html.replace(
      /<blockquote>/g,
      '<blockquote class="border-l-4 border-gray-300 pl-4 italic">'
    );

    return html;
  }

  private addKaTeXSupport(html: string): string {
    // Keep math expressions as-is for KaTeX auto-render to process
    // No need to wrap in custom elements, auto-render will find them
    return html;
  }

  private addCodeHighlighting(html: string): string {
    // Add syntax highlighting classes for highlight.js
    html = html.replace(
      /<pre><code class="language-([^"]+)">/g,
      '<pre class="line-numbers"><code class="language-$1">'
    );

    // Handle code blocks without language
    html = html.replace(
      /<pre><code>/g,
      '<pre class="line-numbers"><code>'
    );

    // Inline code styling remains the same
    html = html.replace(
      /<code>/g,
      '<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm">'
    );

    return html;
  }

  private addTableEnhancements(html: string): string {
    // Enhance tables with responsive classes
    html = html.replace(
      /<table>/g,
      '<div class="overflow-x-auto"><table class="min-w-full border-collapse border border-gray-300 dark:border-gray-600">'
    );

    html = html.replace(
      /<\/table>/g,
      '</table></div>'
    );

    // Style table headers
    html = html.replace(
      /<th>/g,
      '<th class="border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 px-4 py-2 font-semibold">'
    );

    // Style table cells
    html = html.replace(
      /<td>/g,
      '<td class="border border-gray-300 dark:border-gray-600 px-4 py-2">'
    );

    return html;
  }
}

// Create engine instance
const markdownEngine = new MarkdownEngine();

// Worker message handler
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, type, payload } = event.data;
  
  console.log(`📨 Received ${type} request:`, id);
  
  try {
    let result: any;
    
    switch (type) {
      case 'PROCESS_MARKDOWN':
        result = await markdownEngine.processMarkdown(payload.markdown || '');
        break;
        
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
    
    const response: WorkerResponse = {
      id,
      type,
      success: true,
      payload: result
    };
    
    console.log(`✅ ${type} completed:`, id);
    self.postMessage(response);
    
  } catch (error) {
    console.error(`❌ ${type} failed:`, error);
    
    const response: WorkerResponse = {
      id,
      type,
      success: false,
      error: error.message
    };
    
    self.postMessage(response);
  }
};

console.log('✅ New Markdown Engine Worker ready');