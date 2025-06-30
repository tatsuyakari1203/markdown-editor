import React, { useState } from 'react'
import { Download, Settings, FileText, Palette, Container, FileDown } from 'lucide-react'
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

// Import refactored modules
import { ExportDialogProps, ExportOptions } from './export/types'
import { THEME_OPTIONS, CONTAINER_OPTIONS } from './export/constants'
import { downloadFile, getFileName, generateHTML, handlePrintToPDF } from './export/utils'

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

  const handleExport = async () => {
    if (options.exportFormat === 'pdf') {
      await handlePrintToPDF(options, () => generateHTML(options, toast, markdown), toast)
      setIsOpen(false)
      return
    } else {
      const html = await generateHTML(options, toast, markdown)
      if (!html) return
      
      const filename = getFileName(options.pageTitle, 'html')
      downloadFile(html, filename, 'text/html')
      
      toast({
        title: "HTML exported successfully",
        description: `Saved as ${filename}`,
      })
    }
    
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Export Options
          </DialogTitle>
          <DialogDescription>
            Configure your export settings and download your markdown content.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Export Format */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Export Format
            </Label>
            <RadioGroup
              value={options.exportFormat}
              onValueChange={(value) => setOptions(prev => ({ ...prev, exportFormat: value as any }))}
              className="grid grid-cols-3 gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="html" id="html" />
                <Label htmlFor="html" className="text-sm">HTML Fragment</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="html-standalone" id="html-standalone" />
                <Label htmlFor="html-standalone" className="text-sm">Complete HTML</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="text-sm">PDF</Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Theme Selection - Only for Complete HTML and PDF */}
          {(options.exportFormat === 'html-standalone' || options.exportFormat === 'pdf') && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Theme
                </Label>
                <Select
                  value={options.theme}
                  onValueChange={(value) => setOptions(prev => ({ ...prev, theme: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {THEME_OPTIONS.map((theme) => (
                      <SelectItem key={theme.value} value={theme.value}>
                        <div>
                          <div className="font-medium">{theme.label}</div>
                          <div className="text-xs text-muted-foreground">{theme.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Container Options - Only for Complete HTML and PDF */}
          {(options.exportFormat === 'html-standalone' || options.exportFormat === 'pdf') && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Container className="h-4 w-4" />
                  Content Wrapping
                </Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="useContainer"
                      checked={options.useContainer}
                      onCheckedChange={(checked) => setOptions(prev => ({ ...prev, useContainer: !!checked }))}
                    />
                    <Label htmlFor="useContainer" className="text-sm">Wrap content in centered container</Label>
                  </div>
                  
                  {options.useContainer && (
                    <div className="ml-6">
                      <div className="space-y-2">
                        <Label htmlFor="containerClass" className="text-xs text-muted-foreground">Container CSS Class (optional)</Label>
                        <input
                          id="containerClass"
                          type="text"
                          value={options.containerClass}
                          onChange={(e) => setOptions(prev => ({ ...prev, containerClass: e.target.value }))}
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="e.g., markdown-content"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* HTML Options */}
          {(options.exportFormat === 'html-standalone' || options.exportFormat === 'pdf') && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  HTML Options
                </Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeCSS"
                      checked={options.includeCSS}
                      onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeCSS: !!checked }))}
                    />
                    <Label htmlFor="includeCSS" className="text-sm">Include CSS styling</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeMetaTags"
                      checked={options.includeMetaTags}
                      onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeMetaTags: !!checked }))}
                    />
                    <Label htmlFor="includeMetaTags" className="text-sm">Include meta tags</Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pageTitle" className="text-xs text-muted-foreground">Page Title</Label>
                    <input
                      id="pageTitle"
                      type="text"
                      value={options.pageTitle}
                      onChange={(e) => setOptions(prev => ({ ...prev, pageTitle: e.target.value }))}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Document title"
                    />
                  </div>
                </div>
              </div>
            </>
          )}


        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export {options.exportFormat.toUpperCase()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ExportDialog