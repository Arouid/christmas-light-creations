import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import LeadsApp from './LeadsApp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LeadsApp />
  </StrictMode>,
)
