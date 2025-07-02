import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { TabManagerProvider } from './core/contexts/TabManagerContext.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <TabManagerProvider>
          <App />
        </TabManagerProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)
