import { useEffect, useState } from 'react'

// "Install the app": Android/desktop Chrome offer a real install button;
// iPhone/iPad only allow Share → Add to Home Screen, so we show those steps.
const standalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

let deferred = null // Chrome's install prompt, captured before React mounts too
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e })
}

function useInstall() {
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
    if (!prompt) return
    prompt.prompt()
    await prompt.userChoice.catch(() => null)
    setPrompt(null)
  }
  return { installed, canPrompt: Boolean(prompt), ios: isIOS(), install }
}

// Box for Settings; also used as a dismissible banner on phones.
export default function InstallApp({ compact = false, onDismiss }) {
  const { installed, canPrompt, ios, install } = useInstall()
  if (installed) return compact ? null : <p className="text-sm text-emerald-400">✓ You’re using the installed CLC Staff app.</p>
  return (
    <div className={compact ? 'flex flex-wrap items-center gap-x-3 gap-y-2 bg-night-800 px-4 py-2.5 text-sm' : 'space-y-2'}>
      {!compact && <p className="font-semibold">Install the CLC Staff app</p>}
      {canPrompt ? (
        <>
          <span className="text-slate-300">{compact ? 'Get CLC Staff on your home screen.' : 'Adds CLC Staff to your home screen. Opens full-screen, signs in with your Google account.'}</span>
          <button type="button" onClick={install} className="rounded-full bg-glow-400 px-4 py-2 text-sm font-semibold text-night-950">Install app</button>
        </>
      ) : ios ? (
        <span className="text-slate-300">
          {compact ? 'Get the app: ' : 'On iPhone/iPad, in Safari: '}tap <strong>Share</strong> <span aria-hidden="true">⬆︎</span> → <strong>Add to Home Screen</strong> → <strong>Add</strong>.
        </span>
      ) : (
        <span className="text-slate-300">In Chrome: <strong>⋮</strong> menu → <strong>Install app</strong> (or <strong>Add to Home screen</strong>).</span>
      )}
      {compact && onDismiss && <button type="button" onClick={onDismiss} aria-label="Dismiss" className="ml-auto px-2 text-slate-400">✕</button>}
    </div>
  )
}
