// Simple markdown processor with KaTeX support
import { marked } from 'marked';
import katex from 'katex';
import type { WorkerRequest, WorkerResponse } from './types';

console.log('🚀 Simple Markdown Worker starting...');

// Configure marked
marked.setOptions({
  gfm: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  smartLists: true,
  smartypants: false
});

// Math rendering function
function renderMath(text: string): string {
  // Process display math ($$...$$)
  text = text.replace(/\$\$([^$]+)\$\$/g, (match, math) => {
    try {
      return katex.renderToString(math.trim(), {
        displayMode: true,
        throwOnError: false,
        strict: false
      });
    } catch (error) {
      console.warn('KaTeX display math error:', error);
      return match;
    }
  });
  
  // Process inline math ($...$)
  text = text.replace(/\$([^$\n]+)\$/g, (match, math) => {
    try {
      return katex.renderToString(math.trim(), {
        displayMode: false,
        throwOnError: false,
        strict: false
      });
    } catch (error) {
      console.warn('KaTeX inline math error:', error);
      return match;
    }
  });
  
  return text;
}

// HTML sanitization
function sanitizeHtml(html: string): string {
  // Remove script tags
  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // Remove dangerous event handlers
  html = html.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Remove javascript: protocols
  html = html.replace(/javascript:/gi, '');
  
  return html;
}

// Style table elements
function styleTableElements(html: string): string {
  // Wrap tables in responsive container
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

// Main processing function
async function processMarkdown(markdown: string): Promise<string> {
  try {
    if (!markdown || typeof markdown !== 'string') {
      return '<p>No content provided</p>';
    }
    
    console.log('📝 Processing markdown content...');
    
    // First, render math expressions
    const mathRendered = renderMath(markdown);
    
    // Then process markdown
    let html = await marked.parse(mathRendered);
    
    // Add syntax highlighting classes
    html = html.replace(/<pre><code class="language-(\w+)">/g, '<pre class="language-$1 line-numbers"><code class="language-$1">');
    html = html.replace(/<pre><code>/g, '<pre class="line-numbers"><code>');
    
    // Apply table styling
    html = styleTableElements(html);
    
    // Sanitize the HTML
    html = sanitizeHtml(html);
    
    console.log('✅ Markdown processing completed');
    return html;
  } catch (error) {
    console.error('❌ Markdown processing failed:', error);
    return `<div class="error">Error processing markdown: ${error.message}</div>`;
  }
}

// Worker message handler
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, type, payload } = event.data;
  
  console.log(`📨 Received ${type} request:`, id);
  
  try {
    let result: any;
    
    switch (type) {
      case 'PROCESS_MARKDOWN':
        result = await processMarkdown(payload.markdown || '');
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

console.log('✅ Simple Markdown Worker ready');