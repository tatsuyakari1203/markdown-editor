/**
 * Safe localStorage utility with error handling and fallbacks
 */

type StorageKey = 'markdown-editor-content' | 'markdown-editor-theme' | 'gdoc2md.options' | 'gemini-api-key'

class SafeStorage {
  private isAvailable(): boolean {
    try {
      const test = '__storage_test__'
      localStorage.setItem(test, test)
      localStorage.removeItem(test)
      return true
    } catch {
      return false
    }
  }

  getItem(key: StorageKey): string | null {
    if (!this.isAvailable()) {
      console.warn('localStorage is not available')
      return null
    }

    try {
      return localStorage.getItem(key)
    } catch (error) {
      console.error(`Error reading from localStorage (${key}):`, error)
      return null
    }
  }

  setItem(key: StorageKey, value: string): boolean {
    if (!this.isAvailable()) {
      console.warn('localStorage is not available')
      return false
    }

    try {
      localStorage.setItem(key, value)
      return true
    } catch (error) {
      console.error(`Error writing to localStorage (${key}):`, error)
      return false
    }
  }

  removeItem(key: StorageKey): boolean {
    if (!this.isAvailable()) {
      console.warn('localStorage is not available')
      return false
    }

    try {
      localStorage.removeItem(key)
      return true
    } catch (error) {
      console.error(`Error removing from localStorage (${key}):`, error)
      return false
    }
  }

  clear(): boolean {
    if (!this.isAvailable()) {
      console.warn('localStorage is not available')
      return false
    }

    try {
      localStorage.clear()
      return true
    } catch (error) {
      console.error('Error clearing localStorage:', error)
      return false
    }
  }
}

export const safeStorage = new SafeStorage()

// Convenience functions for specific app data
export const getMarkdownContent = (): string | null => {
  return safeStorage.getItem('markdown-editor-content')
}

export const setMarkdownContent = (content: string): boolean => {
  return safeStorage.setItem('markdown-editor-content', content)
}

export const getTheme = (): 'dark' | 'light' | null => {
  const theme = safeStorage.getItem('markdown-editor-theme')
  return theme === 'dark' || theme === 'light' ? theme : null
}

export const setTheme = (theme: 'dark' | 'light'): boolean => {
  return safeStorage.setItem('markdown-editor-theme', theme)
}