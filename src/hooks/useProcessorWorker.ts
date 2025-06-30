import { useState, useEffect, useRef, useCallback } from 'react';

export function useProcessorWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [isWorkerReady, setIsWorkerReady] = useState(false);

  const processMarkdown = useCallback(async (markdown: string): Promise<string> => {
    if (!workerRef.current) {
      throw new Error('Worker not initialized');
    }

    if (!isWorkerReady) {
      throw new Error('Worker not ready');
    }

    return new Promise((resolve, reject) => {
      const requestId = Math.random().toString(36).substr(2, 9);
      const timeoutId = setTimeout(() => {
        reject(new Error('Worker timeout after 10 seconds'));
      }, 10000);

      const handleMessage = (e: MessageEvent) => {
        const { type, id, html, error, processingTime } = e.data;
        
        // Handle ready signal from enhanced worker
        if (type === 'ready') {
          console.log('✅ Enhanced worker ready with capabilities:', e.data.capabilities);
          setIsWorkerReady(true);
          return;
        }
        
        // Only handle messages for this specific request
        if (id !== requestId) {
          return;
        }
        
        clearTimeout(timeoutId);
        workerRef.current?.removeEventListener('message', handleMessage);
        
        if (type === 'result') {
          console.log(`⏱️ Worker processing completed in ${processingTime?.toFixed(2)}ms`);
          resolve(html);
        } else if (type === 'error') {
          reject(new Error(error || 'Unknown worker error'));
        }
      };

      workerRef.current.addEventListener('message', handleMessage);
      workerRef.current.postMessage({ type: 'process', markdown, id: requestId });
    });
  }, [isWorkerReady]);

  useEffect(() => {
    if (!workerRef.current) {
      console.log('🚀 Initializing Enhanced Isolated Web Worker...');
      
      try {
        const workerInstance = new Worker(
          new URL('../workers/isolated.worker.ts', import.meta.url),
          { type: 'module' }
        );
        
        workerRef.current = workerInstance;
        console.log('✅ Enhanced isolated worker created successfully');

        // Global message handler for worker lifecycle events
        workerInstance.onmessage = (e: MessageEvent) => {
          const { type } = e.data;
          
          if (type === 'ready') {
            console.log('✅ Enhanced worker ready with capabilities:', e.data.capabilities);
            setIsWorkerReady(true);
          } else if (type === 'error' && !e.data.id) {
            // Global worker errors without request ID
            console.error('❌ Global worker error:', e.data.error);
          }
          // Other messages will be handled by individual request handlers
        };

        workerInstance.onerror = (e) => {
          console.error('❌ Enhanced isolated worker error:', e);
          console.error('Error details:', {
            message: e.message,
            filename: e.filename,
            lineno: e.lineno,
            colno: e.colno
          });
          setIsWorkerReady(false);
        };

        workerInstance.onmessageerror = (e) => {
          console.error('❌ Enhanced isolated worker message error:', e);
          setIsWorkerReady(false);
        };

      } catch (error) {
        console.error('❌ Failed to create enhanced isolated worker:', error);
        setIsWorkerReady(false);
      }
    }

    return () => {
      if (workerRef.current) {
        console.log('🧹 Cleaning up enhanced isolated worker');
        workerRef.current.terminate();
        workerRef.current = null;
        setIsWorkerReady(false);
      }
    };
  }, []);

  // Health check function
  const pingWorker = useCallback(async (): Promise<boolean> => {
    if (!workerRef.current || !isWorkerReady) {
      return false;
    }

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => resolve(false), 1000);
      
      const handlePong = (e: MessageEvent) => {
        if (e.data.type === 'pong') {
          clearTimeout(timeoutId);
          workerRef.current?.removeEventListener('message', handlePong);
          resolve(true);
        }
      };

      workerRef.current?.addEventListener('message', handlePong);
      workerRef.current?.postMessage({ type: 'ping' });
    });
  }, [isWorkerReady]);

  return { 
    processMarkdown, 
    isWorkerReady, 
    pingWorker,
    // Legacy compatibility
    postTask: processMarkdown
  };
}