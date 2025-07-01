// App-specific hooks
export { useTheme } from './useTheme'
export { useLayout } from './useLayout'
export { useFileOperations } from './useFileOperations'
export { useKeyboardShortcuts } from './useKeyboardShortcuts'
export { useApiKey } from './useApiKey'
export { useAutoCompleteStatus } from './useAutoCompleteStatus'

// Existing hooks
export { useScrollSync } from './useScrollSync'
export { useMarkdownEngine } from './useMarkdownEngine'
export { useToast } from './use-toast'
export { useResponsive } from './use-mobile'
export { useAutoComplete } from './useAutoComplete'
export { useClipboardReader } from './useClipboardReader'

// Types
export type { UseThemeReturn } from './useTheme'
export type { UseLayoutReturn, PanelType, MobileViewType } from './useLayout'
export type { UseFileOperationsReturn } from './useFileOperations'
export type { UseKeyboardShortcutsReturn, UseKeyboardShortcutsProps } from './useKeyboardShortcuts'
export type { UseApiKeyReturn } from './useApiKey'
export type { UseAutoCompleteStatusReturn, AutoCompleteStatus } from './useAutoCompleteStatus'