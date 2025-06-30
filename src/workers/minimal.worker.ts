// Minimal worker to test basic functionality without dependencies
console.log('🔧 Minimal worker starting');
console.log('Worker context:', typeof self, typeof document, typeof window);
console.log('Available globals:', Object.keys(self));

// Test basic worker functionality
self.onmessage = (e: MessageEvent) => {
  console.log('📨 Received message:', e.data);
  
  const response = {
    id: e.data.id,
    type: 'SUCCESS',
    payload: 'Minimal worker is working!'
  };
  
  self.postMessage(response);
};

console.log('✅ Minimal worker ready');