import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { safeStorage, getMarkdownContent, getTheme } from '../lib/storage'

interface StorageDebuggerProps {
  isOpen: boolean
  onClose: () => void
}

export function StorageDebugger({ isOpen, onClose }: StorageDebuggerProps) {
  const [storageStatus, setStorageStatus] = useState<{
    isAvailable: boolean
    markdownContent: string | null
    theme: string | null
    settings: string | null
    error?: string
  }>({ isAvailable: false, markdownContent: null, theme: null, settings: null })

  const checkStorage = () => {
    try {
      // Test localStorage availability
      const test = '__test__'
      localStorage.setItem(test, test)
      localStorage.removeItem(test)
      
      const markdownContent = getMarkdownContent()
      const theme = getTheme()
      const settings = safeStorage.getItem('gdoc2md.options')
      
      setStorageStatus({
        isAvailable: true,
        markdownContent: markdownContent ? `${markdownContent.length} characters` : 'No content',
        theme: theme || 'No theme set',
        settings: settings ? 'Settings found' : 'No settings',
      })
    } catch (error) {
      setStorageStatus({
        isAvailable: false,
        markdownContent: null,
        theme: null,
        settings: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  const clearStorage = () => {
    try {
      safeStorage.removeItem('markdown-editor-content')
      safeStorage.removeItem('markdown-editor-theme')
      safeStorage.removeItem('gdoc2md.options')
      checkStorage()
    } catch (error) {
      console.error('Error clearing storage:', error)
    }
  }

  const testStorage = () => {
    const testKey = 'test-key' as any
    const testValue = 'test-value'
    
    try {
      const success = safeStorage.setItem(testKey, testValue)
      if (success) {
        const retrieved = safeStorage.getItem(testKey)
        if (retrieved === testValue) {
          alert('✅ localStorage test passed!')
        } else {
          alert('❌ localStorage test failed: Retrieved value does not match')
        }
        safeStorage.removeItem(testKey)
      } else {
        alert('❌ localStorage test failed: Could not save value')
      }
    } catch (error) {
      alert(`❌ localStorage test failed: ${error}`)
    }
  }

  useEffect(() => {
    if (isOpen) {
      checkStorage()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>Storage Debugger</CardTitle>
          <CardDescription>
            Debug localStorage functionality and data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>localStorage Available:</span>
              <Badge variant={storageStatus.isAvailable ? 'default' : 'destructive'}>
                {storageStatus.isAvailable ? 'Yes' : 'No'}
              </Badge>
            </div>
            
            {storageStatus.error && (
              <div className="text-sm text-red-600 dark:text-red-400">
                Error: {storageStatus.error}
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <span>Markdown Content:</span>
              <span className="text-sm text-muted-foreground">
                {storageStatus.markdownContent}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Theme:</span>
              <span className="text-sm text-muted-foreground">
                {storageStatus.theme}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Settings:</span>
              <span className="text-sm text-muted-foreground">
                {storageStatus.settings}
              </span>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <Button onClick={checkStorage} variant="outline" size="sm">
              Refresh Status
            </Button>
            <Button onClick={testStorage} variant="outline" size="sm">
              Test Storage
            </Button>
            <Button onClick={clearStorage} variant="destructive" size="sm">
              Clear All Data
            </Button>
            <Button onClick={onClose} size="sm">
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}