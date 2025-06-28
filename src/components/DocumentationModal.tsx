import React, { useState, useEffect } from 'react'
import { X, HelpCircle, Keyboard, Lightbulb, Code, FileText, Zap, Settings, Globe } from 'lucide-react'
import { Button } from './ui/button'

interface DocumentationModalProps {
  isOpen: boolean
  onClose: () => void
}

type Language = 'en' | 'vi'

const DocumentationModal: React.FC<DocumentationModalProps> = ({ isOpen, onClose }) => {
  const [language, setLanguage] = useState<Language>('en')

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

  const content = {
    en: {
      title: 'Markdown Editor Documentation',
      quickStart: {
        title: 'Quick Start',
        description: 'Welcome to the enhanced Markdown Editor! This editor provides a VS Code-like experience with advanced features:',
        features: [
          'Real-time preview with synchronized scrolling',
          'Advanced autocomplete with Markdown snippets',
          'Syntax highlighting and validation',
          'Professional editing features (minimap, folding, multiple cursors)'
        ]
      },
      keyboardShortcuts: {
        title: 'Keyboard Shortcuts',
        editorControls: 'Editor Controls',
        formatting: 'Formatting',
        shortcuts: {
          find: 'Find',
          toggleMinimap: 'Toggle Minimap',
          toggleWordWrap: 'Toggle Word Wrap',
          insertDate: 'Insert Date',
          bold: 'Bold',
          italic: 'Italic',
          inlineCode: 'Inline Code',
          documentation: 'Documentation'
        }
      },
      smartSnippets: {
        title: 'Smart Snippets',
        description: 'Type these keywords and press Tab to insert snippets:',
        categories: {
          tables: 'Tables',
          codeBlocks: 'Code Blocks',
          headers: 'Headers',
          linksMedia: 'Links & Media',
          listsQuotes: 'Lists & Quotes'
        }
      },
      aiFeatures: {
        title: 'AI-Powered Features',
        smartPaste: {
          title: 'Smart Paste',
          features: [
            'Image OCR: Extract text from images automatically',
            'Document Processing: Convert PDFs, Word docs to Markdown',
            'HTML Conversion: Clean HTML to Markdown conversion',
            'Table Recognition: Detect and format tables from images'
          ]
        },
        aiTextProcessing: {
          title: 'AI Text Processing',
          features: [
            'Reformat AI: Improve text structure and formatting',
            'Rewrite AI: Enhance clarity and readability',
            'AutoComplete: Intelligent content suggestions',
            'Context Aware: Understands document context'
          ]
        },
        howToUse: {
          title: 'How to Use AI Features',
          instructions: [
            'Smart Paste: Click the clipboard icon in AI toolbar or paste images/files directly',
            'Reformat/Rewrite: Select text and click the respective AI buttons',
            'AutoComplete: Toggle the sparkle icon and start typing for suggestions',
            'API Key Required: Configure your Gemini API key in settings for AI features'
          ]
        }
      },
      advancedFeatures: {
        title: 'Advanced Features',
        editorFeatures: {
          title: 'Editor Features',
          features: [
            'Minimap: Navigate large documents easily',
            'Code Folding: Collapse sections for better organization',
            'Multiple Cursors: Edit multiple locations simultaneously',
            'Smart Find: Enhanced search with selection seeding'
          ]
        },
        validation: {
          title: 'Validation & Linting',
          features: [
            'Broken Links: Detects empty or invalid URLs',
            'Table Validation: Checks column consistency',
            'Accessibility: Warns about missing alt text',
            'Structure: Suggests content between headers'
          ]
        }
      },
      tipsTricks: {
        title: 'Tips & Tricks',
        tips: [
          'Use Ctrl+Click to create multiple cursors',
          'Hover over line numbers to see folding controls',
          'The minimap shows an overview of your entire document',
          'Validation warnings appear as you type - hover for details',
          'Use the toolbar buttons for quick formatting',
          'Scroll synchronization keeps editor and preview in sync',
          'Press F1 or Ctrl+Shift+P for command palette'
        ]
      },
      footer: {
        closeInstruction: 'Press Esc to close',
        version: 'Enhanced Markdown Editor v2.0'
      }
    },
    vi: {
      title: 'Tài liệu Trình soạn thảo Markdown',
      quickStart: {
        title: 'Bắt đầu nhanh',
        description: 'Chào mừng đến với Trình soạn thảo Markdown nâng cao! Trình soạn thảo này cung cấp trải nghiệm giống VS Code với các tính năng tiên tiến:',
        features: [
          'Xem trước thời gian thực với cuộn đồng bộ',
          'Tự động hoàn thành nâng cao với đoạn mã Markdown',
          'Tô sáng cú pháp và xác thực',
          'Tính năng chỉnh sửa chuyên nghiệp (minimap, gập, nhiều con trỏ)'
        ]
      },
      keyboardShortcuts: {
        title: 'Phím tắt',
        editorControls: 'Điều khiển trình soạn thảo',
        formatting: 'Định dạng',
        shortcuts: {
          find: 'Tìm kiếm',
          toggleMinimap: 'Bật/tắt Minimap',
          toggleWordWrap: 'Bật/tắt xuống dòng',
          insertDate: 'Chèn ngày',
          bold: 'In đậm',
          italic: 'In nghiêng',
          inlineCode: 'Mã nội tuyến',
          documentation: 'Tài liệu'
        }
      },
      smartSnippets: {
        title: 'Đoạn mã thông minh',
        description: 'Gõ các từ khóa này và nhấn Tab để chèn đoạn mã:',
        categories: {
          tables: 'Bảng',
          codeBlocks: 'Khối mã',
          headers: 'Tiêu đề',
          linksMedia: 'Liên kết & Media',
          listsQuotes: 'Danh sách & Trích dẫn'
        }
      },
      aiFeatures: {
        title: 'Tính năng AI',
        smartPaste: {
          title: 'Dán thông minh',
          features: [
            'OCR hình ảnh: Trích xuất văn bản từ hình ảnh tự động',
            'Xử lý tài liệu: Chuyển đổi PDF, Word sang Markdown',
            'Chuyển đổi HTML: Chuyển HTML sang Markdown sạch',
            'Nhận dạng bảng: Phát hiện và định dạng bảng từ hình ảnh'
          ]
        },
        aiTextProcessing: {
          title: 'Xử lý văn bản AI',
          features: [
            'AI định dạng lại: Cải thiện cấu trúc và định dạng văn bản',
            'AI viết lại: Tăng cường độ rõ ràng và dễ đọc',
            'Tự động hoàn thành: Gợi ý nội dung thông minh',
            'Nhận biết ngữ cảnh: Hiểu ngữ cảnh tài liệu'
          ]
        },
        howToUse: {
          title: 'Cách sử dụng tính năng AI',
          instructions: [
            'Dán thông minh: Nhấp vào biểu tượng clipboard trong thanh công cụ AI hoặc dán hình ảnh/tệp trực tiếp',
            'Định dạng lại/Viết lại: Chọn văn bản và nhấp vào các nút AI tương ứng',
            'Tự động hoàn thành: Bật biểu tượng tia lửa và bắt đầu gõ để nhận gợi ý',
            'Yêu cầu API Key: Cấu hình khóa API Gemini trong cài đặt cho các tính năng AI'
          ]
        }
      },
      advancedFeatures: {
        title: 'Tính năng nâng cao',
        editorFeatures: {
          title: 'Tính năng trình soạn thảo',
          features: [
            'Minimap: Điều hướng tài liệu lớn dễ dàng',
            'Gập mã: Thu gọn các phần để tổ chức tốt hơn',
            'Nhiều con trỏ: Chỉnh sửa nhiều vị trí cùng lúc',
            'Tìm kiếm thông minh: Tìm kiếm nâng cao với seeding lựa chọn'
          ]
        },
        validation: {
          title: 'Xác thực & Linting',
          features: [
            'Liên kết bị hỏng: Phát hiện URL trống hoặc không hợp lệ',
            'Xác thực bảng: Kiểm tra tính nhất quán của cột',
            'Khả năng tiếp cận: Cảnh báo về văn bản alt bị thiếu',
            'Cấu trúc: Gợi ý nội dung giữa các tiêu đề'
          ]
        }
      },
      tipsTricks: {
        title: 'Mẹo & Thủ thuật',
        tips: [
          'Sử dụng Ctrl+Click để tạo nhiều con trỏ',
          'Di chuột qua số dòng để xem điều khiển gập',
          'Minimap hiển thị tổng quan toàn bộ tài liệu của bạn',
          'Cảnh báo xác thực xuất hiện khi bạn gõ - di chuột để xem chi tiết',
          'Sử dụng các nút thanh công cụ để định dạng nhanh',
          'Đồng bộ cuộn giữ trình soạn thảo và xem trước đồng bộ',
          'Nhấn F1 hoặc Ctrl+Shift+P cho bảng lệnh'
        ]
      },
      footer: {
        closeInstruction: 'Nhấn Esc để đóng',
        version: 'Trình soạn thảo Markdown nâng cao v2.0'
      }
    }
  }

  const t = content[language]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 backdrop-blur-md" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative backdrop-blur-lg rounded-lg shadow-2xl max-w-[95vw] max-h-[90vh] w-full mx-4 overflow-hidden bg-gray-900/95">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/20 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <HelpCircle className="w-6 h-6 text-gray-300" />
            <h2 className="text-2xl font-bold text-white">{t.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === 'en' ? 'vi' : 'en')}
              className="text-gray-300 hover:text-white"
            >
              <Globe className="w-4 h-4 mr-1" />
              {language === 'en' ? 'VI' : 'EN'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] text-white" style={{scrollbarWidth: 'thin', scrollbarColor: '#4b5563 transparent'}}>
          {/* Quick Start */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-gray-300" />
              <h3 className="text-xl font-semibold text-white">{t.quickStart.title}</h3>
            </div>
            <div className="bg-white/5 rounded-lg p-4 mb-4">
              <p className="text-gray-300 mb-2">{t.quickStart.description}</p>
              <ul className="list-disc list-inside text-gray-300 space-y-1">
                {t.quickStart.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </div>
          </section>

          {/* Keyboard Shortcuts */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Keyboard className="w-5 h-5 text-gray-300" />
              <h3 className="text-xl font-semibold text-white">{t.keyboardShortcuts.title}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="font-semibold text-gray-200 mb-3">{t.keyboardShortcuts.editorControls}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">{t.keyboardShortcuts.shortcuts.find}</span>
                    <kbd className="bg-gray-700 px-2 py-1 rounded text-xs">Ctrl+F</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">{t.keyboardShortcuts.shortcuts.toggleMinimap}</span>
                    <kbd className="bg-gray-700 px-2 py-1 rounded text-xs">Ctrl+Shift+M</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">{t.keyboardShortcuts.shortcuts.toggleWordWrap}</span>
                    <kbd className="bg-gray-700 px-2 py-1 rounded text-xs">Alt+Z</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">{t.keyboardShortcuts.shortcuts.insertDate}</span>
                    <kbd className="bg-gray-700 px-2 py-1 rounded text-xs">Ctrl+Shift+D</kbd>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="font-semibold text-gray-200 mb-3">{t.keyboardShortcuts.formatting}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">{t.keyboardShortcuts.shortcuts.bold}</span>
                    <kbd className="bg-gray-700 px-2 py-1 rounded text-xs">Ctrl+B</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">{t.keyboardShortcuts.shortcuts.italic}</span>
                    <kbd className="bg-gray-700 px-2 py-1 rounded text-xs">Ctrl+I</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">{t.keyboardShortcuts.shortcuts.inlineCode}</span>
                    <kbd className="bg-gray-700 px-2 py-1 rounded text-xs">Ctrl+`</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">{t.keyboardShortcuts.shortcuts.documentation}</span>
                    <kbd className="bg-gray-700 px-2 py-1 rounded text-xs">F1</kbd>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Snippets */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Code className="w-5 h-5 text-gray-300" />
              <h3 className="text-xl font-semibold text-white">{t.smartSnippets.title}</h3>
            </div>
            <div className="bg-white/5 rounded-lg p-4 mb-4">
              <p className="text-gray-300 mb-4">{t.smartSnippets.description} <kbd className="bg-gray-700 px-2 py-1 rounded text-xs">Tab</kbd></p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-200 mb-2">{t.smartSnippets.categories.tables}</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li><code className="bg-gray-700 px-1 rounded">table2x2</code> - 2x2 table</li>
                    <li><code className="bg-gray-700 px-1 rounded">table3x3</code> - 3x3 table</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-200 mb-2">{t.smartSnippets.categories.codeBlocks}</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li><code className="bg-gray-700 px-1 rounded">codeblock</code> - Generic code</li>
                    <li><code className="bg-gray-700 px-1 rounded">codejs</code> - JavaScript</li>
                    <li><code className="bg-gray-700 px-1 rounded">codepy</code> - Python</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-200 mb-2">{t.smartSnippets.categories.headers}</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li><code className="bg-gray-700 px-1 rounded">h1</code> - Header 1</li>
                    <li><code className="bg-gray-700 px-1 rounded">h2</code> - Header 2</li>
                    <li><code className="bg-gray-700 px-1 rounded">h3</code> - Header 3</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-200 mb-2">{t.smartSnippets.categories.linksMedia}</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li><code className="bg-gray-700 px-1 rounded">link</code> - Hyperlink</li>
                    <li><code className="bg-gray-700 px-1 rounded">image</code> - Image</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-200 mb-2">{t.smartSnippets.categories.listsQuotes}</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li><code className="bg-gray-700 px-1 rounded">checklist</code> - Task list</li>
                    <li><code className="bg-gray-700 px-1 rounded">quote</code> - Blockquote</li>
                    <li><code className="bg-gray-700 px-1 rounded">callout</code> - Callout box</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* AI Features */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-blue-400" />
              <h3 className="text-xl font-semibold text-white">{t.aiFeatures.title}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-500/10 backdrop-blur-lg rounded-lg p-4">
                <h4 className="font-semibold text-blue-200 mb-3">{t.aiFeatures.smartPaste.title}</h4>
                <ul className="text-sm text-gray-300 space-y-2">
                  {t.aiFeatures.smartPaste.features.map((feature, index) => (
                    <li key={index}>• <span dangerouslySetInnerHTML={{ __html: feature.replace(/^([^:]+):/, '<strong>$1</strong>:') }} /></li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-purple-500/10 backdrop-blur-lg rounded-lg p-4">
                <h4 className="font-semibold text-purple-200 mb-3">{t.aiFeatures.aiTextProcessing.title}</h4>
                <ul className="text-sm text-gray-300 space-y-2">
                  {t.aiFeatures.aiTextProcessing.features.map((feature, index) => (
                    <li key={index}>• <span dangerouslySetInnerHTML={{ __html: feature.replace(/^([^:]+):/, '<strong>$1</strong>:') }} /></li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-lg rounded-lg p-4 mt-4">
              <h4 className="font-semibold text-gray-200 mb-3">{t.aiFeatures.howToUse.title}</h4>
              <ul className="text-sm text-gray-300 space-y-2">
                {t.aiFeatures.howToUse.instructions.map((instruction, index) => (
                  <li key={index}>• <span dangerouslySetInnerHTML={{ __html: instruction.replace(/^([^:]+):/, '<strong>$1</strong>:') }} /></li>
                ))}
              </ul>
            </div>
          </section>

          {/* Advanced Features */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-gray-300" />
              <h3 className="text-xl font-semibold text-white">{t.advancedFeatures.title}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="font-semibold text-gray-200 mb-3">{t.advancedFeatures.editorFeatures.title}</h4>
                <ul className="text-sm text-gray-300 space-y-2">
                  {t.advancedFeatures.editorFeatures.features.map((feature, index) => (
                    <li key={index}>• <span dangerouslySetInnerHTML={{ __html: feature.replace(/^([^:]+):/, '<strong>$1</strong>:') }} /></li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="font-semibold text-gray-200 mb-3">{t.advancedFeatures.validation.title}</h4>
                <ul className="text-sm text-gray-300 space-y-2">
                  {t.advancedFeatures.validation.features.map((feature, index) => (
                    <li key={index}>• <span dangerouslySetInnerHTML={{ __html: feature.replace(/^([^:]+):/, '<strong>$1</strong>:') }} /></li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Tips & Tricks */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-gray-300" />
              <h3 className="text-xl font-semibold text-white">{t.tipsTricks.title}</h3>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <ul className="text-sm text-gray-300 space-y-2">
                {t.tipsTricks.tips.map((tip, index) => (
                  <li key={index}>• <span dangerouslySetInnerHTML={{ __html: tip.replace(/Ctrl\+Click/g, '<kbd class="bg-gray-700 px-1 rounded text-xs">Ctrl+Click</kbd>').replace(/F1/g, '<kbd class="bg-gray-700 px-1 rounded text-xs">F1</kbd>').replace(/Ctrl\+Shift\+P/g, '<kbd class="bg-gray-700 px-1 rounded text-xs">Ctrl+Shift+P</kbd>') }} /></li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-white/20 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span dangerouslySetInnerHTML={{ __html: t.footer.closeInstruction.replace(/Esc/g, '<kbd class="bg-gray-700 px-2 py-1 rounded text-xs">Esc</kbd>') }} />
            <span>{t.footer.version}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DocumentationModal