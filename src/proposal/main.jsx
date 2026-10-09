import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import ProposalPage from './ProposalPage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ProposalPage />
  </StrictMode>,
)
