import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import InvoicePage from './InvoicePage.jsx'

// Never inside another site's frame (someone could overlay the Pay button).
const framed = window.top !== window.self

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {framed
      ? <p className="p-6 text-center"><a href={window.location.href} target="_top" rel="noopener" className="underline">Open this page in its own window</a></p>
      : <InvoicePage />}
  </StrictMode>,
)
