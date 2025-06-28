export interface ExportDialogProps {
  markdown: string
  isDarkMode: boolean
}

export interface ExportOptions {
  theme: 'github-light' | 'github-dark' | 'minimal-light' | 'minimal-dark' | 'custom'
  useContainer: boolean
  containerType: 'div' | 'article' | 'main' | 'section'
  containerClass: string
  includeCSS: boolean
  includeMetaTags: boolean
  pageTitle: string
  exportFormat: 'html' | 'html-standalone' | 'pdf'
  pdfOptions: {
    format: 'a4' | 'letter' | 'legal'
    orientation: 'portrait' | 'landscape'
    margin: number
  }
}

export interface ThemeOption {
  value: string
  label: string
  description: string
}

export interface ContainerOption {
  value: string
  label: string
  description: string
}