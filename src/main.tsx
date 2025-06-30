import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { DocumentProvider } from './core/contexts/DocumentContext.tsx'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <DocumentProvider>
        <App />
      </DocumentProvider>
    </ErrorBoundary>
  </StrictMode>,
)
