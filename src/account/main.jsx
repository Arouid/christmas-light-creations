import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import AccountPage from './AccountPage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AccountPage />
  </StrictMode>,
)
