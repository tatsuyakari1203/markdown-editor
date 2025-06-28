import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { ExportOptions } from './types'

export const generatePDF = async (options: ExportOptions, toast: any) => {
  const preview = document.querySelector('.markdown-preview-content')
  if (!preview) {
    toast({
      title: "Export failed",
      description: "Preview content not found",
      variant: "destructive",
    })
    return
  }

  try {
    const pdf = new jsPDF({
      orientation: options.pdfOptions.orientation,
      unit: 'mm',
      format: options.pdfOptions.format
    })

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = options.pdfOptions.margin
    
    // Only support image mode (removed selectable text mode)
    const canvas = await html2canvas(preview as HTMLElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: preview.scrollWidth,
      height: preview.scrollHeight,
      scrollX: 0,
      scrollY: 0
    })
    
    const imgData = canvas.toDataURL('image/png')
    const imgWidth = pageWidth - (margin * 2)
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    
    let heightLeft = imgHeight
    let position = margin
    
    // Add first page
    pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight)
    heightLeft -= (pageHeight - margin * 2)
    
    // Add additional pages if needed
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margin
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight)
      heightLeft -= (pageHeight - margin * 2)
    }
    
    return pdf
  } catch (error) {
    toast({
      title: "PDF generation failed",
      description: "An error occurred while generating the PDF",
      variant: "destructive",
    })
    return null
  }
}