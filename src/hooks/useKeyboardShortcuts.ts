import { useEffect } from 'react'

export interface UseKeyboardShortcutsProps {
  onDocumentationOpen: () => void
}

export interface UseKeyboardShortcutsReturn {
  // This hook manages keyboard shortcuts internally
  // Returns empty object for now, can be extended with shortcut status if needed
}

export function useKeyboardShortcuts({
  onDocumentationOpen
}: UseKeyboardShortcutsProps): UseKeyboardShortcutsReturn {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F1') {
        event.preventDefault()
        onDocumentationOpen()
      }
      // Add more keyboard shortcuts here as needed
      // Example:
      // if (event.ctrlKey && event.key === 's') {
      //   event.preventDefault()
      //   onSave()
      // }
    }

    if (document) {
      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [onDocumentationOpen])

  return {}
}