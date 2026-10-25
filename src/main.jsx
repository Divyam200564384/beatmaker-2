import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/baloo-2/400.css'
import '@fontsource/baloo-2/700.css'
import './styles/tokens.css'
import './styles/global.css'
import App from './App.jsx'
import ErrorBoundary from './ui/ErrorBoundary.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
