import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import ProposalPage from './ProposalPage.jsx'

// Never inside another site's frame (someone could overlay Sign or Pay).
const framed = window.top !== window.self

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {framed
      ? <p className="p-6 text-center"><a href={window.location.href} target="_top" rel="noopener" className="underline">Open this page in its own window</a></p>
      : <ProposalPage />}
  </StrictMode>,
)
