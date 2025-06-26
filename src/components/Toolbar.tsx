import React, { useState } from 'react'
import { 
  Bold, 
  Italic, 
  Code, 
  List, 
  ListOrdered,
  Quote,
  Link,
  Image,
  Heading1,
  Heading2,
  Heading3,
  Minus,
  Table,
  Strikethrough
} from 'lucide-react'
import { Button } from './ui/button'
import { Separator } from './ui/separator'

interface ToolbarProps {
  markdown: string
  setMarkdown: (value: string) => void
  isDarkMode: boolean
}

const Toolbar: React.FC<ToolbarProps> = ({ markdown, setMarkdown, isDarkMode }) => {

  const insertText = (before: string, after: string = '', placeholder: string = '') => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = markdown.substring(start, end)
    const textToInsert = selectedText || placeholder
    
    const newText = markdown.substring(0, start) + before + textToInsert + after + markdown.substring(end)
    setMarkdown(newText)
    
    // Set cursor position
    setTimeout(() => {
      textarea.focus()
      if (selectedText) {
        textarea.setSelectionRange(start + before.length, start + before.length + textToInsert.length)
      } else {
        textarea.setSelectionRange(start + before.length, start + before.length + placeholder.length)
      }
    }, 0)
  }



  const insertAtLineStart = (prefix: string) => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const beforeCursor = markdown.substring(0, start)
    const afterCursor = markdown.substring(start)
    
    const lines = beforeCursor.split('\n')
    const currentLineStart = beforeCursor.lastIndexOf('\n') + 1
    const currentLine = lines[lines.length - 1]
    
    if (currentLine.startsWith(prefix)) {
      // Remove prefix if it already exists
      const newLine = currentLine.substring(prefix.length)
      const newText = markdown.substring(0, currentLineStart) + newLine + afterCursor
      setMarkdown(newText)
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start - prefix.length, start - prefix.length)
      }, 0)
    } else {
      // Add prefix
      const newText = markdown.substring(0, currentLineStart) + prefix + currentLine + afterCursor
      setMarkdown(newText)
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + prefix.length, start + prefix.length)
      }, 0)
    }
  }

  const insertTable = () => {
    const tableText = `
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Row 1    | Data     | Data     |
| Row 2    | Data     | Data     |
`
    insertText(tableText)
  }

  const insertLink = () => {
    const url = prompt('Enter URL:')
    if (url) {
      insertText('[', `](${url})`, 'Link text')
    }
  }

  const insertImage = () => {
    const url = prompt('Enter image URL:')
    if (url) {
      insertText('![', `](${url})`, 'Alt text')
    }
  }

  const toolbarButtons = [
    // Text formatting
    { icon: Bold, action: () => insertText('**', '**', 'bold text'), title: 'Bold (Ctrl+B)', group: 'format' },
    { icon: Italic, action: () => insertText('*', '*', 'italic text'), title: 'Italic (Ctrl+I)', group: 'format' },
    { icon: Strikethrough, action: () => insertText('~~', '~~', 'strikethrough'), title: 'Strikethrough', group: 'format' },
    { icon: Code, action: () => insertText('`', '`', 'code'), title: 'Inline Code (Ctrl+`)', group: 'format' },
    
    // Headers
    { icon: Heading1, action: () => insertAtLineStart('# '), title: 'Heading 1', group: 'headers' },
    { icon: Heading2, action: () => insertAtLineStart('## '), title: 'Heading 2', group: 'headers' },
    { icon: Heading3, action: () => insertAtLineStart('### '), title: 'Heading 3', group: 'headers' },
    
    // Lists and quotes
    { icon: List, action: () => insertAtLineStart('- '), title: 'Bullet List', group: 'lists' },
    { icon: ListOrdered, action: () => insertAtLineStart('1. '), title: 'Numbered List', group: 'lists' },
    { icon: Quote, action: () => insertAtLineStart('> '), title: 'Blockquote', group: 'lists' },
    
    // Special elements
    { icon: Link, action: insertLink, title: 'Link', group: 'elements' },
    { icon: Image, action: insertImage, title: 'Image', group: 'elements' },
    { icon: Minus, action: () => insertText('\n---\n'), title: 'Horizontal Rule', group: 'elements' },
    { icon: Table, action: insertTable, title: 'Table', group: 'elements' },
  ]

  const groupedButtons = toolbarButtons.reduce((acc, button) => {
    if (!acc[button.group]) {
      acc[button.group] = []
    }
    acc[button.group].push(button)
    return acc
  }, {} as Record<string, typeof toolbarButtons>)

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'b':
            e.preventDefault()
            insertText('**', '**', 'bold text')
            break
          case 'i':
            e.preventDefault()
            insertText('*', '*', 'italic text')
            break
          case '`':
            e.preventDefault()
            insertText('`', '`', 'code')
            break

        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [markdown])

  return (
    <>
      {/* Toolbar Buttons */}
      <div className="flex items-center space-x-1">
        {Object.entries(groupedButtons).map(([group, buttons], groupIndex) => (
          <React.Fragment key={group}>
            {groupIndex > 0 && <Separator orientation="vertical" className="h-6 mx-1" />}
            <div className="flex items-center space-x-1">
              {buttons.map((button, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  onClick={button.action}
                  title={button.title}
                  className="h-8 w-8 p-0 hover:bg-muted transition-colors duration-200"
                >
                  <button.icon className="w-4 h-4" />
                </Button>
              ))}
            </div>
          </React.Fragment>
        ))}
      </div>


    </>
  )
}

export default Toolbar
