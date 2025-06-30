// Completely isolated worker with enhanced markdown processing
// Uses only basic JavaScript without any DOM-dependent libraries

console.log('🔧 Enhanced isolated worker starting');
console.log('Worker context:', typeof self, typeof window, typeof document);

// Enhanced markdown to HTML conversion
function enhancedMarkdownToHtml(markdown: string): string {
  let html = markdown;
  
  // Escape HTML entities first
  html = html.replace(/&/g, '&amp;')
             .replace(/</g, '&lt;')
             .replace(/>/g, '&gt;')
             .replace(/"/g, '&quot;')
             .replace(/'/g, '&#39;');
  
  // Headers (must be at start of line)
  html = html.replace(/^#{6}\s+(.*)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#{5}\s+(.*)$/gm, '<h5>$1</h5>');
  html = html.replace(/^#{4}\s+(.*)$/gm, '<h4>$1</h4>');
  html = html.replace(/^#{3}\s+(.*)$/gm, '<h3>$1</h3>');
  html = html.replace(/^#{2}\s+(.*)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#{1}\s+(.*)$/gm, '<h1>$1</h1>');
  
  // Code blocks (fenced)
  html = html.replace(/```([\w]*)?\n([\s\S]*?)```/g, (match, lang, code) => {
    const language = lang ? ` class="language-${lang}"` : '';
    return `<pre><code${language}>${code.trim()}</code></pre>`;
  });
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Bold and italic (order matters)
  html = html.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/___([^_]+)___/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
  
  // Strikethrough
  html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2">$1</a>');
  
  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^\)]+)\)/g, '<img src="$2" alt="$1" />');
  
  // Horizontal rules
  html = html.replace(/^---+$/gm, '<hr>');
  html = html.replace(/^\*\*\*+$/gm, '<hr>');
  
  // Lists (basic implementation)
  html = html.replace(/^\s*[-*+]\s+(.*)$/gm, '<li>$1</li>');
  html = html.replace(/^\s*\d+\.\s+(.*)$/gm, '<li>$1</li>');
  
  // Wrap consecutive list items
  html = html.replace(/(<li>.*<\/li>\s*)+/gs, (match) => {
    return `<ul>${match}</ul>`;
  });
  
  // Blockquotes
  html = html.replace(/^>\s+(.*)$/gm, '<blockquote>$1</blockquote>');
  
  // Paragraphs (split by double newlines)
  const paragraphs = html.split(/\n\s*\n/);
  html = paragraphs.map(p => {
    p = p.trim();
    if (!p) return '';
    // Don't wrap if already wrapped in block elements
    if (p.match(/^<(h[1-6]|pre|ul|ol|blockquote|hr)/)) {
      return p;
    }
    return `<p>${p}</p>`;
  }).join('\n');
  
  // Clean up extra newlines
  html = html.replace(/\n+/g, '\n').trim();
  
  return html;
}

// Process markdown function with error handling
function processMarkdown(markdown: string): string {
  console.log('📝 Processing markdown with enhanced converter');
  
  try {
    if (!markdown || typeof markdown !== 'string') {
      console.warn('⚠️ Invalid markdown input');
      return '<p>No content to process</p>';
    }
    
    const html = enhancedMarkdownToHtml(markdown);
    console.log('✅ Enhanced markdown processing completed');
    return html;
  } catch (error) {
    console.error('❌ Enhanced markdown processing failed:', error);
    return `<p>Error processing markdown: ${error instanceof Error ? error.message : String(error)}</p>`;
  }
}

// Worker message handler with comprehensive error handling
self.onmessage = function(e) {
  console.log('📨 Enhanced isolated worker received message:', e.data?.type);
  
  try {
    const { type, markdown, id } = e.data || {};
    
    if (type === 'process') {
      const startTime = performance.now();
      const result = processMarkdown(markdown);
      const endTime = performance.now();
      
      console.log(`⏱️ Processing took ${(endTime - startTime).toFixed(2)}ms`);
      
      self.postMessage({
        type: 'result',
        html: result,
        id: id,
        processingTime: endTime - startTime
      });
    } else if (type === 'ping') {
      // Health check
      self.postMessage({
        type: 'pong',
        timestamp: Date.now()
      });
    } else {
      console.warn('⚠️ Unknown message type:', type);
      self.postMessage({
        type: 'error',
        error: `Unknown message type: ${type}`,
        id: id
      });
    }
  } catch (error) {
    console.error('❌ Enhanced isolated worker message handling failed:', error);
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
      id: e.data?.id
    });
  }
};

// Worker error handler
self.onerror = function(error) {
  console.error('❌ Enhanced isolated worker global error:', error);
  self.postMessage({
    type: 'error',
    error: `Worker global error: ${error.message || error}`
  });
};

// Unhandled promise rejection handler
self.addEventListener('unhandledrejection', function(event) {
  console.error('❌ Enhanced isolated worker unhandled rejection:', event.reason);
  self.postMessage({
    type: 'error',
    error: `Worker unhandled rejection: ${event.reason}`
  });
});

console.log('✅ Enhanced isolated worker initialization completed successfully');

// Send ready signal
self.postMessage({
  type: 'ready',
  timestamp: Date.now(),
  capabilities: ['markdown-to-html', 'basic-formatting', 'code-blocks', 'lists', 'links']
});