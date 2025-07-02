import React, { useEffect } from 'react'
import { X, FileText } from 'lucide-react'
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Documentation
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-8 text-center">
          <div className="mb-6">
            <div className="bg-yellow-100 dark:bg-yellow-900/30 p-4 rounded-lg mb-4">
              <div className="text-yellow-600 dark:text-yellow-400 text-4xl mb-2">🚧</div>
              <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                Documentation In Progress
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                We're currently working on comprehensive documentation for this application.
              </p>
            </div>
          </div>
          
          <div className="text-gray-600 dark:text-gray-400 text-sm">
            <p className="mb-4">
              This markdown editor is currently under active development. 
              Documentation will be available soon with detailed guides and tutorials.
            </p>
            <p>
              Thank you for your patience! 🙏
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DocumentationModal