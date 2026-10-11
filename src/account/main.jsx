import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import AccountPage from './AccountPage.jsx'

// Never inside another site's frame (someone could overlay Sign or Pay).
const framed = window.top !== window.self

// The installed app's helper (public/account/sw.js): an offline page, and
// Chrome needs it before it offers one-tap install. Nothing else is cached.
if ('serviceWorker' in navigator && !framed) {
  window.addEventListener('load', () => { navigator.serviceWorker.register(`${import.meta.env.BASE_URL}account/sw.js`).catch(() => {}) })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {framed
      ? <p className="p-6 text-center"><a href={window.location.href} target="_top" rel="noopener" className="underline">Open this page in its own window</a></p>
      : <AccountPage />}
  </StrictMode>,
)
