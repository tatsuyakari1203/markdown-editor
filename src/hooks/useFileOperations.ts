import { useToast } from './use-toast'

export interface UseFileOperationsReturn {
  copyMarkdown: (content: string) => Promise<void>
  downloadMarkdown: (content: string, filename?: string) => void
}

export function useFileOperations(): UseFileOperationsReturn {
  const { toast } = useToast()

  const copyMarkdown = async (content: string) => {
    if (!content) return
    try {
      await navigator.clipboard.writeText(content)
      toast({
        title: "Copied to clipboard",
        description: "Markdown content copied successfully",
      })
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard",
        variant: "destructive",
      })
    }
  }

  const downloadMarkdown = (content: string, filename = 'document') => {
    if (!content) return
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.md`
    a.click()
    URL.revokeObjectURL(url)
    toast({
      title: "Download started",
      description: "Markdown file downloaded successfully",
    })
  }

  return {
    copyMarkdown,
    downloadMarkdown
  }
}