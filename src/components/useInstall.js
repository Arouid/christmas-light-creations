import { useEffect, useState } from 'react'

// Is this page running as an installed app, and can Chrome install it right
// now? Shared by the staff app (/leads/) and customers' /account/; the buttons
// and steps are in InstallApp.jsx.
export const standalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
export const isIos = () => /iP(hone|ad|od)/.test(navigator.userAgent)

let deferred = null // Chrome's install prompt, captured before React mounts too
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e })
}

export function useInstall() {
  const [prompt, setPrompt] = useState(deferred)
  const [installed, setInstalled] = useState(standalone)
  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); deferred = e; setPrompt(e) }
    const onInstalled = () => { setInstalled(true); setPrompt(null) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled) }
  }, [])
  async function install() {
    if (!prompt) return false
    prompt.prompt()
    const choice = await prompt.userChoice.catch(() => null)
    setPrompt(null)
    return choice?.outcome === 'accepted'
  }
  return { installed, canPrompt: Boolean(prompt), install }
}
