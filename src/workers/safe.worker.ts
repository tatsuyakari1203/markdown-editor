// Safe worker implementation without DOM dependencies
console.log('🔧 Safe worker starting - checking environment');
console.log('Worker context:', typeof self, typeof document, typeof window);

try {
  console.log('📦 Starting safe imports...');
  
  // Import only basic remark plugins
  console.log('1️⃣ Importing unified...');
  const { unified } = await import('unified');
  console.log('✅ unified imported');
  
  console.log('2️⃣ Importing remark-parse...');
  const remarkParse = (await import('remark-parse')).default;
  console.log('✅ remark-parse imported');
  
  console.log('3️⃣ Importing remark-gfm...');
  const remarkGfm = (await import('remark-gfm')).default;
  console.log('✅ remark-gfm imported');
  
  console.log('4️⃣ Importing remark-stringify...');
  const remarkStringify = (await import('remark-stringify')).default;
  console.log('✅ remark-stringify imported');
  
  console.log('5️⃣ Importing types...');
  const { WorkerRequest, WorkerResponse } = await import('./types');
  console.log('✅ types imported');
  
  console.log('📦 All safe imports loaded successfully');
  
  console.log('🔧 Creating safe processor...');
  // Create a simple processor that only handles basic markdown
  const markdownProcessor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkStringify);
  console.log('✅ Safe processor created successfully');
  
  /**
   * Simple markdown processing function
   * @param markdown - Input markdown string
   */
  async function processMarkdown(markdown: string): Promise<string> {
    // For now, just return the markdown as-is since we're avoiding HTML conversion
    // This is a temporary solution to test worker functionality
    const result = await markdownProcessor.process(markdown);
    return String(result);
  }
  
  // Listen for messages from main thread
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
  
  console.log('🎉 Safe worker initialization completed successfully');
  
} catch (error) {
  console.error('❌ Safe worker initialization failed:', error);
  
  // Send error to main thread if possible
  self.onmessage = (e: MessageEvent) => {
    const response = {
      id: e.data.id,
      type: 'ERROR',
      payload: {
        message: `Safe worker initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        stack: error instanceof Error ? error.stack : undefined
      }
    };
    self.postMessage(response);
  };
}