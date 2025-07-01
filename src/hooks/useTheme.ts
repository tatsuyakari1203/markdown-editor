import { useState, useEffect } from 'react'
import { getTheme, setTheme } from '../lib/storage'
import { useToast } from './use-toast'

export interface UseThemeReturn {
  isDarkMode: boolean
  toggleTheme: () => void
}

export function useTheme(): UseThemeReturn {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = getTheme()
    return saved === 'dark'
  })
  const { toast } = useToast()

  // Theme persistence and DOM updates
  useEffect(() => {
    setTheme(isDarkMode ? 'dark' : 'light')
    if (document.documentElement) {
      if (isDarkMode) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }, [isDarkMode])

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
    toast({
      title: isDarkMode ? "Light mode enabled" : "Dark mode enabled",
      description: "Theme preference saved automatically",
    })
  }

  return {
    isDarkMode,
    toggleTheme
  }
}