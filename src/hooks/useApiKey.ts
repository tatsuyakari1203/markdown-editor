import { useState } from 'react'

export interface UseApiKeyReturn {
  apiKey: string
  setApiKey: (key: string) => void
  handleApiKeyChange: (newApiKey: string) => void
}

export function useApiKey(): UseApiKeyReturn {
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('gemini-api-key') || ''
  })

  const handleApiKeyChange = (newApiKey: string) => {
    setApiKey(newApiKey)
    localStorage.setItem('gemini-api-key', newApiKey)
  }

  return {
    apiKey,
    setApiKey,
    handleApiKeyChange
  }
}