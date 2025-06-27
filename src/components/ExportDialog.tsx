import React, { useState } from 'react'
import { Download, Settings, FileText, Palette, Container } from 'lucide-react'
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import { Label } from './ui/label'
import { RadioGroup, RadioGroupItem } from './ui/radio-group'
import { Checkbox } from './ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Separator } from './ui/separator'
import { useToast } from '../hooks/use-toast'

interface ExportDialogProps {
  markdown: string
  isDarkMode: boolean
}

interface ExportOptions {
  theme: 'github-light' | 'github-dark' | 'minimal-light' | 'minimal-dark' | 'custom'
  useContainer: boolean
  containerType: 'div' | 'article' | 'main' | 'section'
  containerClass: string
  includeCSS: boolean
  includeMetaTags: boolean
  pageTitle: string
  exportFormat: 'html' | 'html-standalone'
}

const ExportDialog: React.FC<ExportDialogProps> = ({ markdown, isDarkMode }) => {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ExportOptions>({
    theme: isDarkMode ? 'github-dark' : 'github-light',
    useContainer: true,
    containerType: 'div',
    containerClass: 'markdown-body',
    includeCSS: true,
    includeMetaTags: true,
    pageTitle: 'Markdown Export',
    exportFormat: 'html-standalone'
  })

  const themeOptions = [
    { value: 'github-light', label: 'GitHub Light', description: 'Classic GitHub styling (light)' },
    { value: 'github-dark', label: 'GitHub Dark', description: 'Classic GitHub styling (dark)' },
    { value: 'minimal-light', label: 'Minimal Light', description: 'Clean, minimal styling (light)' },
    { value: 'minimal-dark', label: 'Minimal Dark', description: 'Clean, minimal styling (dark)' },
    { value: 'custom', label: 'Custom', description: 'No predefined styles' }
  ]

  const containerOptions = [
    { value: 'div', label: '<div>', description: 'Generic container' },
    { value: 'article', label: '<article>', description: 'Semantic article element' },
    { value: 'main', label: '<main>', description: 'Main content element' },
    { value: 'section', label: '<section>', description: 'Section element' }
  ]

  const getSyntaxHighlightingCSS = (isDark: boolean) => {
    return `
    /* Code Block Styles */
    .code-block-wrapper {
      margin: 1rem 0;
      border-radius: 6px;
      border: 1px solid ${isDark ? '#374151' : '#e5e7eb'};
      overflow: hidden;
    }
    
    .code-block-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 500;
      background: ${isDark ? '#1f2937' : '#f9fafb'};
      border-bottom: 1px solid ${isDark ? '#374151' : '#e5e7eb'};
      color: ${isDark ? '#d1d5db' : '#6b7280'};
    }
    
    .code-block-copy {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 4px;
      transition: background-color 0.2s;
      background: transparent;
      border: none;
      cursor: pointer;
      color: ${isDark ? '#9ca3af' : '#6b7280'};
    }
    
    .code-block-copy:hover {
      background: ${isDark ? '#374151' : '#e5e7eb'};
      color: ${isDark ? '#f3f4f6' : '#374151'};
    }
    
    .code-block-content {
      background: ${isDark ? '#1f2937' : '#f9fafb'};
    }
    
    /* Syntax Highlighting Styles */
    .syntax-highlighted pre {
      margin: 0 !important;
      border-radius: 0 0 6px 6px !important;
      font-size: 14px !important;
      line-height: 1.5 !important;
      padding: 16px !important;
      background: ${isDark ? '#1f2937' : '#f9fafb'} !important;
      overflow-x: auto;
    }
    
    .syntax-highlighted .linenumber {
      min-width: 3em;
      padding-right: 1em;
      color: ${isDark ? '#6b7280' : '#9ca3af'} !important;
      border-right: 1px solid ${isDark ? '#374151' : '#e5e7eb'};
      margin-right: 1em;
      text-align: right;
    }
    `
  }

  const getThemeCSS = (theme: string) => {
    switch (theme) {
      case 'github-light':
        return 'https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.8.1/github-markdown-light.min.css'
      case 'github-dark':
        return 'https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.8.1/github-markdown-dark.min.css'
      case 'minimal-light':
        return `
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 2rem; }
        h1, h2, h3, h4, h5, h6 { margin-top: 2rem; margin-bottom: 1rem; font-weight: 600; }
        p { margin-bottom: 1rem; }
        code { background: #f6f8fa; padding: 0.2em 0.4em; border-radius: 3px; font-size: 85%; }
        pre { background: #f6f8fa; padding: 1rem; border-radius: 6px; overflow-x: auto; }
        blockquote { border-left: 4px solid #dfe2e5; padding-left: 1rem; margin: 1rem 0; color: #6a737d; }
        table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
        th, td { border: 1px solid #dfe2e5; padding: 0.5rem 1rem; text-align: left; }
        th { background: #f6f8fa; font-weight: 600; }
        `
      case 'minimal-dark':
        return `
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #e6edf3; background: #0d1117; max-width: 800px; margin: 0 auto; padding: 2rem; }
        h1, h2, h3, h4, h5, h6 { margin-top: 2rem; margin-bottom: 1rem; font-weight: 600; color: #f0f6fc; }
        p { margin-bottom: 1rem; }
        code { background: #21262d; padding: 0.2em 0.4em; border-radius: 3px; font-size: 85%; color: #f0f6fc; }
        pre { background: #21262d; padding: 1rem; border-radius: 6px; overflow-x: auto; }
        blockquote { border-left: 4px solid #30363d; padding-left: 1rem; margin: 1rem 0; color: #8b949e; }
        table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
        th, td { border: 1px solid #30363d; padding: 0.5rem 1rem; text-align: left; }
        th { background: #21262d; font-weight: 600; }
        `
      default:
        return ''
    }
  }

  const generateHTML = () => {
    const preview = document.querySelector('.markdown-preview-content')
    if (!preview) {
      toast({
        title: "Export failed",
        description: "Preview content not found",
        variant: "destructive",
      })
      return
    }

    let content = preview.innerHTML
    
    // Wrap content in container if specified
    if (options.useContainer) {
      const containerClass = options.containerClass ? ` class="${options.containerClass}"` : ''
      content = `<${options.containerType}${containerClass}>${content}</${options.containerType}>`
    }

    if (options.exportFormat === 'html-standalone') {
      // Generate complete HTML document
      const metaTags = options.includeMetaTags ? `
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="Markdown Editor">` : ''
      
      const cssLink = options.includeCSS && options.theme !== 'custom' ? 
        (options.theme.startsWith('github') ? 
          `\n  <link rel="stylesheet" href="${getThemeCSS(options.theme)}">` :
          `\n  <style>${getThemeCSS(options.theme)}</style>`) : ''
      
      // Add syntax highlighting CSS
      const syntaxCSS = options.includeCSS ? 
        `\n  <style>${getSyntaxHighlightingCSS(options.theme.includes('dark'))}</style>` : ''
      
      const html = `<!DOCTYPE html>
<html lang="en">
<head>${metaTags}
  <title>${options.pageTitle}</title>${cssLink}${syntaxCSS}
</head>
<body>
  ${content}
</body>
</html>`
      
      return html
    } else {
      // Return just the HTML content
      return content
    }
  }

  const handleExport = () => {
    const html = generateHTML()
    if (!html) return

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${options.pageTitle.toLowerCase().replace(/\s+/g, '-')}.html`
    a.click()
    URL.revokeObjectURL(url)
    
    toast({
      title: "HTML exported",
      description: `File exported with ${options.theme} theme`,
    })
    
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8">
          <Download className="w-3 h-3 mr-1" />
          HTML
        </Button>
      </DialogTrigger>
      <DialogContent className={`max-w-2xl max-h-[90vh] overflow-y-auto ${
        isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            <Settings className="w-5 h-5" />
            Export HTML Options
          </DialogTitle>
          <DialogDescription className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
            Customize your HTML export with theme, container, and formatting options.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Theme Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              <Label className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Theme</Label>
            </div>
            <RadioGroup
              value={options.theme}
              onValueChange={(value) => setOptions(prev => ({ ...prev, theme: value as any }))}
              className="space-y-2"
            >
              {themeOptions.map((theme) => (
                <div key={theme.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={theme.value} id={theme.value} />
                  <div className="flex-1">
                    <Label htmlFor={theme.value} className={`text-sm font-medium cursor-pointer ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {theme.label}
                    </Label>
                    <p className={`text-xs ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {theme.description}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Separator className={isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} />

          {/* Container Options */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Container className="w-4 h-4" />
              <Label className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Container</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="useContainer"
                checked={options.useContainer}
                onCheckedChange={(checked) => setOptions(prev => ({ ...prev, useContainer: !!checked }))}
              />
              <Label htmlFor="useContainer" className={`text-sm cursor-pointer ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Wrap content in container element
              </Label>
            </div>

            {options.useContainer && (
              <div className="space-y-3 ml-6">
                <div>
                  <Label className={`text-sm ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>Container Type</Label>
                  <Select
                    value={options.containerType}
                    onValueChange={(value) => setOptions(prev => ({ ...prev, containerType: value as any }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {containerOptions.map((container) => (
                        <SelectItem key={container.value} value={container.value}>
                          <div>
                            <div className="font-medium">{container.label}</div>
                            <div className="text-xs text-gray-500">{container.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="containerClass" className={`text-sm ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>CSS Class (optional)</Label>
                  <input
                    id="containerClass"
                    type="text"
                    value={options.containerClass}
                    onChange={(e) => setOptions(prev => ({ ...prev, containerClass: e.target.value }))}
                    placeholder="e.g., markdown-body, content"
                    className={`mt-1 w-full px-3 py-2 border rounded-md text-sm ${
                      isDarkMode 
                        ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>
              </div>
            )}
          </div>

          <Separator className={isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} />

          {/* Export Format */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <Label className={`text-sm font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Export Format</Label>
            </div>
            <RadioGroup
              value={options.exportFormat}
              onValueChange={(value) => setOptions(prev => ({ ...prev, exportFormat: value as any }))}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="html-standalone" id="html-standalone" />
                <div className="flex-1">
                  <Label htmlFor="html-standalone" className={`text-sm font-medium cursor-pointer ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Complete HTML Document
                  </Label>
                  <p className={`text-xs ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Full HTML page with DOCTYPE, head, and body tags
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="html" id="html" />
                <div className="flex-1">
                  <Label htmlFor="html" className={`text-sm font-medium cursor-pointer ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    HTML Fragment
                  </Label>
                  <p className={`text-xs ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Just the HTML content without document structure
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Additional Options */}
          {options.exportFormat === 'html-standalone' && (
            <>
              <Separator className={isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} />
              
              <div className="space-y-3">
                <Label className={`text-sm font-medium ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>Additional Options</Label>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeCSS"
                      checked={options.includeCSS}
                      onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeCSS: !!checked }))}
                    />
                    <Label htmlFor="includeCSS" className={`text-sm cursor-pointer ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Include CSS styling
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeMetaTags"
                      checked={options.includeMetaTags}
                      onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeMetaTags: !!checked }))}
                    />
                    <Label htmlFor="includeMetaTags" className={`text-sm cursor-pointer ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Include meta tags (charset, viewport)
                    </Label>
                  </div>

                  <div>
                    <Label htmlFor="pageTitle" className={`text-sm ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>Page Title</Label>
                    <input
                      id="pageTitle"
                      type="text"
                      value={options.pageTitle}
                      onChange={(e) => setOptions(prev => ({ ...prev, pageTitle: e.target.value }))}
                      placeholder="Document title"
                      className={`mt-1 w-full px-3 py-2 border rounded-md text-sm ${
                        isDarkMode 
                          ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            className={isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : ''}
          >
            Cancel
          </Button>
          <Button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Download className="w-4 h-4 mr-2" />
            Export HTML
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ExportDialog