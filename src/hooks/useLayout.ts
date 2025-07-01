import { useState } from 'react'
import { useResponsive } from './use-mobile'

export type PanelType = 'editor' | 'preview' | 'both'
export type MobileViewType = 'editor' | 'preview'

export interface UseLayoutReturn {
  activePanel: PanelType
  setActivePanel: (panel: PanelType) => void
  mobileView: MobileViewType
  setMobileView: (view: MobileViewType) => void
  isFullscreen: boolean
  toggleFullscreen: () => void
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
}

export function useLayout(): UseLayoutReturn {
  const [activePanel, setActivePanel] = useState<PanelType>('both')
  const [mobileView, setMobileView] = useState<MobileViewType>('editor')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const { isMobile, isTablet, isDesktop } = useResponsive()

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
    if (document && document.documentElement) {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen()
      } else {
        document.exitFullscreen()
      }
    }
  }

  return {
    activePanel,
    setActivePanel,
    mobileView,
    setMobileView,
    isFullscreen,
    toggleFullscreen,
    isMobile,
    isTablet,
    isDesktop
  }
}