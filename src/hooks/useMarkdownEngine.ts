// New Markdown Engine Hook - Replaces useProcessorWorker
import { useCallback, useEffect, useRef, useState } from 'react';
import type { WorkerRequest, WorkerResponse } from '../workers/types';

interface MarkdownEngineState {
  isReady: boolean;
  isProcessing: boolean;
  error: string | null;
}

interface UseMarkdownEngineReturn {
  processMarkdown: (markdown: string) => Promise<string>;
  state: MarkdownEngineState;
  cleanup: () => void;
}

export function useMarkdownEngine(): UseMarkdownEngineReturn {
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const pendingRequestsRef = useRef<Map<string, {
    resolve: (value: string) => void;
    reject: (error: Error) => void;
  }>>(new Map());
  
  const [state, setState] = useState<MarkdownEngineState>({
    isReady: false,
    isProcessing: false,
    error: null
  });

  // Initialize worker
  useEffect(() => {
    console.log('🚀 Initializing new markdown engine...');
    
    try {
      // Create new worker
      workerRef.current = new Worker(
        new URL('../workers/markdown.worker.ts', import.meta.url),
        { type: 'module' }
      );

      // Handle worker messages
      workerRef.current.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const { id, success, payload, error } = event.data;
        
        const pendingRequest = pendingRequestsRef.current.get(id);
        if (!pendingRequest) {
          console.warn('⚠️ Received response for unknown request:', id);
          return;
        }
        
        pendingRequestsRef.current.delete(id);
        
        if (success) {
          pendingRequest.resolve(payload);
        } else {
          pendingRequest.reject(new Error(error || 'Unknown worker error'));
        }
        
        // Update processing state
        setState(prev => ({
          ...prev,
          isProcessing: pendingRequestsRef.current.size > 0
        }));
      };

      // Handle worker errors
      workerRef.current.onerror = (error) => {
        console.error('❌ Markdown worker error:', error);
        setState(prev => ({
          ...prev,
          error: 'Worker error occurred',
          isReady: false
        }));
      };

      // Mark as ready
      setState(prev => ({
        ...prev,
        isReady: true,
        error: null
      }));
      
      console.log('✅ Markdown engine initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize markdown engine:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to initialize worker',
        isReady: false
      }));
    }

    // Cleanup on unmount
    return () => {
      if (workerRef.current) {
        console.log('🧹 Cleaning up markdown engine...');
        workerRef.current.terminate();
        workerRef.current = null;
      }
      
      // Reject all pending requests
      pendingRequestsRef.current.forEach(({ reject }) => {
        reject(new Error('Worker terminated'));
      });
      pendingRequestsRef.current.clear();
    };
  }, []);

  // Process markdown function
  const processMarkdown = useCallback(async (markdown: string): Promise<string> => {
    if (!workerRef.current || !state.isReady) {
      throw new Error('Markdown engine not ready');
    }

    const requestId = `req_${++requestIdRef.current}_${Date.now()}`;
    
    console.log('📝 Processing markdown request:', requestId);
    
    return new Promise<string>((resolve, reject) => {
      // Store request handlers
      pendingRequestsRef.current.set(requestId, { resolve, reject });
      
      // Update processing state
      setState(prev => ({
        ...prev,
        isProcessing: true,
        error: null
      }));
      
      // Send request to worker
      const request: WorkerRequest = {
        id: requestId,
        type: 'PROCESS_MARKDOWN',
        payload: { markdown }
      };
      
      workerRef.current!.postMessage(request);
      
      // Set timeout for request
      setTimeout(() => {
        const pendingRequest = pendingRequestsRef.current.get(requestId);
        if (pendingRequest) {
          pendingRequestsRef.current.delete(requestId);
          pendingRequest.reject(new Error('Request timeout'));
          
          setState(prev => ({
            ...prev,
            isProcessing: pendingRequestsRef.current.size > 0,
            error: 'Request timeout'
          }));
        }
      }, 10000); // 10 second timeout
    });
  }, [state.isReady]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    
    pendingRequestsRef.current.forEach(({ reject }) => {
      reject(new Error('Manual cleanup'));
    });
    pendingRequestsRef.current.clear();
    
    setState({
      isReady: false,
      isProcessing: false,
      error: null
    });
  }, []);

  return {
    processMarkdown,
    state,
    cleanup
  };
}

export default useMarkdownEngine;