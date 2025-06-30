// src/workers/processor.worker.ts
console.log('🔧 Worker starting - checking environment');
console.log('Worker context:', typeof self, typeof document, typeof window);
console.log('Available globals:', Object.keys(self));

try {
  console.log('📦 Starting imports...');
  
  console.log('1️⃣ Importing unified...');
  const { unified } = await import('unified');
  console.log('✅ unified imported');
  
  console.log('2️⃣ Importing remark-parse...');
  const remarkParse = (await import('remark-parse')).default;
  console.log('✅ remark-parse imported');
  
  console.log('3️⃣ Importing remark-gfm...');
  const remarkGfm = (await import('remark-gfm')).default;
  console.log('✅ remark-gfm imported');
  
  console.log('4️⃣ Importing remark-math...');
  const remarkMath = (await import('remark-math')).default;
  console.log('✅ remark-math imported');
  
  console.log('5️⃣ Importing remark-rehype...');
  const remarkRehype = (await import('remark-rehype')).default;
  console.log('✅ remark-rehype imported');
  
  console.log('6️⃣ Importing rehype-sanitize...');
  const rehypeSanitize = (await import('rehype-sanitize')).default;
  console.log('✅ rehype-sanitize imported');
  
  console.log('7️⃣ Importing rehype-stringify...');
  const rehypeStringify = (await import('rehype-stringify')).default;
  console.log('✅ rehype-stringify imported');
  
  console.log('8️⃣ Importing types...');
  const { WorkerRequest, WorkerResponse } = await import('./types');
  console.log('✅ types imported');
  
  console.log('📦 All imports loaded successfully');
  
  // Worker-safe sanitization schema
  const workerSafeSchema = {
    tagNames: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr',
      'strong', 'em', 'b', 'i', 'u', 's', 'del', 'ins',
      'code', 'pre', 'kbd', 'samp', 'var',
      'blockquote', 'cite', 'q',
      'ul', 'ol', 'li', 'dl', 'dt', 'dd',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
      'a', 'img',
      'div', 'span', 'section', 'article', 'aside', 'nav',
      'details', 'summary'
    ],
    attributes: {
      '*': ['className', 'id'],
      'a': ['href', 'title', 'target', 'rel'],
      'img': ['src', 'alt', 'title', 'width', 'height'],
      'code': ['className'],
      'pre': ['className'],
      'th': ['align', 'scope'],
      'td': ['align'],
      'table': ['align']
    },
    protocols: {
      'href': ['http', 'https', 'mailto'],
      'src': ['http', 'https']
    }
  };
  
  console.log('🔧 Creating unified processor...');
  // Cấu hình processor unified một lần khi worker khởi tạo
  const markdownProcessor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeSanitize, workerSafeSchema)
    .use(rehypeStringify);
  console.log('✅ Unified processor created successfully');
   
   /**
    * Hàm xử lý Markdown sang HTML
    * @param markdown - Chuỗi Markdown đầu vào
    */
   async function processMarkdown(markdown: string): Promise<string> {
     const result = await markdownProcessor.process(markdown);
     return String(result);
   }
   
   // Lắng nghe tin nhắn từ luồng chính
   self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
     const { id, type, payload } = e.data;
     try {
       let resultPayload: any;
       switch (type) {
         case 'PROCESS_MARKDOWN':
           resultPayload = await processMarkdown(payload.markdown);
           break;
         default:
           throw new Error(`Unknown message type: ${type}`);
       }
       
       const response: WorkerResponse = {
         id,
         type: 'SUCCESS',
         payload: resultPayload
       };
       self.postMessage(response);
     } catch (error) {
       const response: WorkerResponse = {
         id,
         type: 'ERROR',
         payload: {
           message: error instanceof Error ? error.message : 'Unknown error',
           stack: error instanceof Error ? error.stack : undefined
         }
       };
       self.postMessage(response);
     }
   };
   
   console.log('🎉 Worker initialization completed successfully');
   
} catch (error) {
  console.error('❌ Worker initialization failed:', error);
  
  // Send error to main thread if possible
  self.onmessage = (e: MessageEvent) => {
    const response = {
      id: e.data.id,
      type: 'ERROR',
      payload: {
        message: `Worker initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        stack: error instanceof Error ? error.stack : undefined
      }
    };
    self.postMessage(response);
  };
}