import { useState } from 'react'

export interface AutoCompleteStatus {
  isEnabled: boolean
  isLoading: boolean
  lastActivity: string
}

export interface UseAutoCompleteStatusReturn {
  autoCompleteStatus: AutoCompleteStatus
  setAutoCompleteStatus: (status: AutoCompleteStatus) => void
}

export function useAutoCompleteStatus(): UseAutoCompleteStatusReturn {
  const [autoCompleteStatus, setAutoCompleteStatus] = useState<AutoCompleteStatus>({
    isEnabled: false,
    isLoading: false,
    lastActivity: 'Ready'
  })

  return {
    autoCompleteStatus,
    setAutoCompleteStatus
  }
}