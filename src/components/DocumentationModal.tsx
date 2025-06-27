import React, { useState, useEffect } from 'react'
import { X, HelpCircle, Keyboard, Lightbulb, Code, FileText, Zap, Settings } from 'lucide-react'
import { Button } from './ui/button'

interface DocumentationModalProps {
  isOpen: boolean
  onClose: () => void
}

const DocumentationModal: React.FC<DocumentationModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative backdrop-blur-lg border border-white/20 rounded-lg shadow-2xl max-w-[95vw] max-h-[90vh] w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/20 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <HelpCircle className="w-6 h-6 text-gray-300" />
            <h2 className="text-2xl font-bold text-white">Markdown Editor Documentation</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] text-white" style={{scrollbarWidth: 'thin', scrollbarColor: '#4b5563 transparent'}}>
          {/* Quick Start */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-gray-300" />
              <h3 className="text-xl font-semibold text-white">Quick Start</h3>
            </div>
            <div className="bg-white/5 rounded-lg p-4 mb-4">
              <p className="text-gray-300 mb-2">Welcome to the enhanced Markdown Editor! This editor provides a VS Code-like experience with advanced features:</p>
              <ul className="list-disc list-inside text-gray-300 space-y-1">
                <li>Real-time preview with synchronized scrolling</li>
                <li>Advanced autocomplete with Markdown snippets</li>
                <li>Syntax highlighting and validation</li>
                <li>Professional editing features (minimap, folding, multiple cursors)</li>
              </ul>
            </div>
          </section>

          {/* Keyboard Shortcuts */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Keyboard className="w-5 h-5 text-gray-300" />
              <h3 className="text-xl font-semibold text-white">Keyboard Shortcuts</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="font-semibold text-gray-200 mb-3">Editor Controls</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Find</span>
                    <kbd className="bg-gray-700 px-2 py-1 rounded text-xs">Ctrl+F</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Toggle Minimap</span>
                    <kbd className="bg-gray-700 px-2 py-1 rounded text-xs">Ctrl+Shift+M</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Toggle Word Wrap</span>
                    <kbd className="bg-gray-700 px-2 py-1 rounded text-xs">Alt+Z</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Insert Date</span>
                    <kbd className="bg-gray-700 px-2 py-1 rounded text-xs">Ctrl+Shift+D</kbd>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="font-semibold text-gray-200 mb-3">Formatting</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Bold</span>
                    <kbd className="bg-gray-700 px-2 py-1 rounded text-xs">Ctrl+B</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Italic</span>
                    <kbd className="bg-gray-700 px-2 py-1 rounded text-xs">Ctrl+I</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Inline Code</span>
                    <kbd className="bg-gray-700 px-2 py-1 rounded text-xs">Ctrl+`</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Paste from Clipboard</span>
                    <kbd className="bg-gray-700 px-2 py-1 rounded text-xs">Ctrl+Shift+V</kbd>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Snippets */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Code className="w-5 h-5 text-gray-300" />
              <h3 className="text-xl font-semibold text-white">Smart Snippets</h3>
            </div>
            <div className="bg-white/5 rounded-lg p-4 mb-4">
              <p className="text-gray-300 mb-4">Type these keywords and press <kbd className="bg-gray-700 px-2 py-1 rounded text-xs">Tab</kbd> to insert snippets:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-200 mb-2">Tables</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li><code className="bg-gray-700 px-1 rounded">table2x2</code> - 2x2 table</li>
                    <li><code className="bg-gray-700 px-1 rounded">table3x3</code> - 3x3 table</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-200 mb-2">Code Blocks</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li><code className="bg-gray-700 px-1 rounded">codeblock</code> - Generic code</li>
                    <li><code className="bg-gray-700 px-1 rounded">codejs</code> - JavaScript</li>
                    <li><code className="bg-gray-700 px-1 rounded">codepy</code> - Python</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-200 mb-2">Headers</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li><code className="bg-gray-700 px-1 rounded">h1</code> - Header 1</li>
                    <li><code className="bg-gray-700 px-1 rounded">h2</code> - Header 2</li>
                    <li><code className="bg-gray-700 px-1 rounded">h3</code> - Header 3</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-200 mb-2">Links & Media</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li><code className="bg-gray-700 px-1 rounded">link</code> - Hyperlink</li>
                    <li><code className="bg-gray-700 px-1 rounded">image</code> - Image</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-200 mb-2">Lists & Quotes</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li><code className="bg-gray-700 px-1 rounded">checklist</code> - Task list</li>
                    <li><code className="bg-gray-700 px-1 rounded">quote</code> - Blockquote</li>
                    <li><code className="bg-gray-700 px-1 rounded">callout</code> - Callout box</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Advanced Features */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-gray-300" />
              <h3 className="text-xl font-semibold text-white">Advanced Features</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="font-semibold text-gray-200 mb-3">Editor Features</h4>
                <ul className="text-sm text-gray-300 space-y-2">
                  <li>• <strong>Minimap</strong>: Navigate large documents easily</li>
                  <li>• <strong>Code Folding</strong>: Collapse sections for better organization</li>
                  <li>• <strong>Multiple Cursors</strong>: Edit multiple locations simultaneously</li>
                  <li>• <strong>Smart Find</strong>: Enhanced search with selection seeding</li>
                </ul>
              </div>
              
              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="font-semibold text-gray-200 mb-3">Validation & Linting</h4>
                <ul className="text-sm text-gray-300 space-y-2">
                  <li>• <strong>Broken Links</strong>: Detects empty or invalid URLs</li>
                  <li>• <strong>Table Validation</strong>: Checks column consistency</li>
                  <li>• <strong>Accessibility</strong>: Warns about missing alt text</li>
                  <li>• <strong>Structure</strong>: Suggests content between headers</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Tips & Tricks */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-gray-300" />
              <h3 className="text-xl font-semibold text-white">Tips & Tricks</h3>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <ul className="text-sm text-gray-300 space-y-2">
                <li>• Use <kbd className="bg-gray-700 px-1 rounded text-xs">Ctrl+Click</kbd> to create multiple cursors</li>
                <li>• Hover over line numbers to see folding controls</li>
                <li>• The minimap shows an overview of your entire document</li>
                <li>• Validation warnings appear as you type - hover for details</li>
                <li>• Use the toolbar buttons for quick formatting</li>
                <li>• Scroll synchronization keeps editor and preview in sync</li>
                <li>• Press <kbd className="bg-gray-700 px-1 rounded text-xs">F1</kbd> or <kbd className="bg-gray-700 px-1 rounded text-xs">Ctrl+Shift+P</kbd> for command palette</li>
              </ul>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-white/20 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>Press <kbd className="bg-gray-700 px-2 py-1 rounded text-xs">Esc</kbd> to close</span>
            <span>Enhanced Markdown Editor v2.0</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DocumentationModal