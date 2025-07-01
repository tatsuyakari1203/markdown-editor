import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { TabManagerProvider } from './core/contexts/TabManagerContext.tsx'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <TabManagerProvider>
        <App />
      </TabManagerProvider>
    </ErrorBoundary>
  </StrictMode>,
)
