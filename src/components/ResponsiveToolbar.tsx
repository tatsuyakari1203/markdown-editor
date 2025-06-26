import React, { useState } from 'react'
import { Button } from './ui/button'
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Quote, 
  Code, 
  Link, 
  Image, 
  Table,
  MoreHorizontal,
  ChevronDown
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { useResponsive } from '../hooks/use-mobile'

interface ResponsiveToolbarProps {
  markdown: string
  setMarkdown: (value: string) => void
  isDarkMode: boolean
}

const ResponsiveToolbar: React.FC<ResponsiveToolbarProps> = ({
  markdown,
  setMarkdown,
  isDarkMode
}) => {
  const { isMobile } = useResponsive()
  const [isExpanded, setIsExpanded] = useState(false)

  const insertText = (before: string, after: string = '', placeholder: string = '') => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = markdown.substring(start, end)
    const textToInsert = selectedText || placeholder
    
    const newText = markdown.substring(0, start) + before + textToInsert + after + markdown.substring(end)
    setMarkdown(newText)
    
    // Focus and set cursor position
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + before.length + textToInsert.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  const toolbarItems = [
    { icon: Bold, action: () => insertText('**', '**', 'bold text'), label: 'Bold' },
    { icon: Italic, action: () => insertText('*', '*', 'italic text'), label: 'Italic' },
    { icon: Code, action: () => insertText('`', '`', 'code'), label: 'Code' },
    { icon: Quote, action: () => insertText('> ', '', 'quote'), label: 'Quote' },
    { icon: List, action: () => insertText('- ', '', 'list item'), label: 'List' },
    { icon: ListOrdered, action: () => insertText('1. ', '', 'list item'), label: 'Ordered List' },
    { icon: Link, action: () => insertText('[', '](url)', 'link text'), label: 'Link' },
    { icon: Image, action: () => insertText('![', '](url)', 'alt text'), label: 'Image' },
    { icon: Table, action: () => insertText('\n| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n', '', ''), label: 'Table' }
  ]

  if (isMobile) {
    const primaryItems = toolbarItems.slice(0, 4)
    const secondaryItems = toolbarItems.slice(4)

    return (
      <div className="flex items-center space-x-1">
        {/* Primary tools always visible */}
        {primaryItems.map((item, index) => (
          <Button
            key={index}
            variant="ghost"
            size="sm"
            onClick={item.action}
            className={`h-8 w-8 p-0 ${
              isDarkMode 
                ? 'hover:bg-gray-700 text-gray-300' 
                : 'hover:bg-gray-100 text-gray-600'
            }`}
            title={item.label}
          >
            <item.icon className="w-4 h-4" />
          </Button>
        ))}
        
        {/* More menu for secondary tools */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 ${
                isDarkMode 
                  ? 'hover:bg-gray-700 text-gray-300' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className={isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
          >
            {secondaryItems.map((item, index) => (
              <DropdownMenuItem
                key={index}
                onClick={item.action}
                className={`cursor-pointer ${
                  isDarkMode 
                    ? 'hover:bg-gray-700 text-gray-300' 
                    : 'hover:bg-gray-100 text-gray-900'
                }`}
              >
                <item.icon className="w-4 h-4 mr-2" />
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  // Desktop version - show all tools
  return (
    <div className="flex items-center space-x-1">
      {toolbarItems.map((item, index) => (
        <Button
          key={index}
          variant="ghost"
          size="sm"
          onClick={item.action}
          className={`h-8 px-2 ${
            isDarkMode 
              ? 'hover:bg-gray-700 text-gray-300' 
              : 'hover:bg-gray-100 text-gray-600'
          }`}
          title={item.label}
        >
          <item.icon className="w-4 h-4" />
        </Button>
      ))}
    </div>
  )
}

export default ResponsiveToolbar