/**
 * Shared Markdown Processing Service
 * Centralizes worker creation and management for markdown processing
 */

import type { WorkerRequest, WorkerResponse } from '../workers/types'

export interface MarkdownProcessingOptions {
  includeCSS?: boolean
  includeKaTeX?: boolean
  timeout?: number
}

export interface MarkdownProcessingResult {
  html: string
  css?: string
}

class MarkdownProcessorService {
  private static instance: MarkdownProcessorService
  private workerPool: Worker[] = []
  private readonly maxWorkers = 3

  private constructor() {}

  static getInstance(): MarkdownProcessorService {
    if (!MarkdownProcessorService.instance) {
      MarkdownProcessorService.instance = new MarkdownProcessorService
    }
    return MarkdownProcessorService.instance
  }

  /**
   * Process markdown content using a web worker
   */
  async processMarkdown(
    content: string, 
    options: MarkdownProcessingOptions = {}
  ): Promise<MarkdownProcessingResult> {
    const { includeCSS = false, includeKaTeX = false, timeout = 30000 } = options

    return new Promise((resolve, reject) => {
      const worker = this.createWorker()
      const requestId = `req_${Date.now()}_${Math.random()}`
      
      const timeoutId = setTimeout(() => {
        this.terminateWorker(worker)
        reject(new Error('Markdown processing timeout'))
      }, timeout)

      worker.onmessage = async (event: MessageEvent<WorkerResponse>) => {
        const { id, success, payload, error } = event.data
        
        if (id === requestId) {
          clearTimeout(timeoutId)
          this.terminateWorker(worker)
          
          if (success) {
            const result: MarkdownProcessingResult = {
              html: payload
            }

            if (includeCSS) {
              try {
                result.css = await this.getMarkdownCSS()
              } catch (error) {
                console.warn('Failed to load CSS, continuing without it:', error)
              }
            }
            
            resolve(result)
          } else {
            reject(new Error(error || 'Processing failed'))
          }
        }
      }

      worker.onerror = (error) => {
        clearTimeout(timeoutId)
        this.terminateWorker(worker)
        reject(error)
      }

      const request: WorkerRequest = {
        id: requestId,
        type: 'PROCESS_MARKDOWN',
        payload: { markdown: content }
      }
      
      worker.postMessage(request)
    })
  }

  /**
   * Get markdown CSS content
   */
  async getMarkdownCSS(): Promise<string> {
    try {
      const response = await fetch('/src/styles/markdown-base.css')
      return await response.text()
    } catch (error) {
      console.warn('Failed to load markdown-base.css, using fallback styles')
      return this.getFallbackCSS()
    }
  }

  /**
   * Fallback CSS for when main CSS file cannot be loaded
   */
  private getFallbackCSS(): string {
    return `
.markdown-content {
  line-height: 1.6;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.markdown-content h1, .markdown-content h2, .markdown-content h3 {
  margin: 1.5em 0 0.5em 0;
  font-weight: 600;
}
.markdown-content p { margin: 1em 0; }
.markdown-content code {
  background: #f5f5f5;
  padding: 0.125em 0.25em;
  border-radius: 3px;
  font-family: monospace;
}
`
  }

  /**
   * Create a new worker instance
   */
  private createWorker(): Worker {
    return new Worker(
      new URL('../workers/markdown.worker.ts', import.meta.url),
      { type: 'module' }
    )
  }

  /**
   * Terminate worker and clean up
   */
  private terminateWorker(worker: Worker): void {
    worker.terminate()
  }

  /**
   * Clean up all resources
   */
  cleanup(): void {
    this.workerPool.forEach(worker => worker.terminate())
    this.workerPool = []
  }
}

export default MarkdownProcessorService