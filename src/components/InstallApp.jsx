import { useState } from 'react'
import { useInstall } from './useInstall'

// Install one of our web apps on a phone's home screen (no app store): the
// staff app at /leads/ and customers' /account/ both use this. Android and
// desktop Chrome install with one tap when the browser offers it; iPhone and
// iPad only allow Safari's Share → Add to Home Screen. Generic icons on
// purpose: store badges and brand logos are only allowed for real store
// listings. The hook lives in useInstall.js.

const PhoneDownload = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
    <rect x="6" y="2" width="12" height="20" rx="2.5" /><path d="M12 7v7m-3-3 3 3 3-3M10 18.5h4" />
  </svg>
)
const ShareIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
    <path d="M12 3v12M8 7l4-4 4 4" /><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
  </svg>
)
const PlusSquare = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" {...p}>
    <rect x="4" y="4" width="16" height="16" rx="3" /><path d="M12 8v8M8 12h8" />
  </svg>
)

// The steps for each kind of phone. `app` is the name under the icon; `signIn`
// finishes the last step ("sign in with Google").
function stepsFor(which, app, signIn) {
  if (which === 'android') {
    return {
      title: 'Install on Android',
      steps: [
        <>Open this page in <strong>Chrome</strong>.</>,
        <>Tap the <strong>⋮</strong> menu (top right).</>,
        <>Tap <strong>Install app</strong> (or <strong>Add to Home screen</strong>) → <strong>Install</strong>.</>,
        <>Open <strong>{app}</strong> from your home screen and {signIn}.</>,
      ],
    }
  }
  return {
    title: 'Install on iPhone or iPad',
    steps: [
      <>Open this page in <strong>Safari</strong> (it has to be Safari).</>,
      <>Tap <strong>Share</strong> <ShareIcon className="inline size-4 align-[-2px]" /> at the bottom of the screen.</>,
      <>Scroll down and tap <strong>Add to Home Screen</strong> <PlusSquare className="inline size-4 align-[-2px]" />, then <strong>Add</strong>.</>,
      <>Open <strong>{app}</strong> from your home screen and {signIn}.</>,
    ],
  }
}

export function Steps({ which, app, signIn, onClose }) {
  const s = stepsFor(which, app, signIn)
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-night-950/85 p-4 backdrop-blur" role="dialog" aria-modal="true" aria-label={s.title} onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-night-900 p-5 text-left" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold">{s.title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="px-2 text-slate-400">✕</button>
        </div>
        <ol className="mt-4 space-y-3">
          {s.steps.map((step, i) => (
            <li key={i} className="flex gap-3 text-slate-200">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-glow-400 text-sm font-bold text-night-950">{i + 1}</span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
        <button type="button" onClick={onClose} className="mt-5 w-full rounded-full bg-white/10 py-3 font-semibold">Got it</button>
      </div>
    </div>
  )
}

// The two store-style buttons. Android installs right away when Chrome allows
// it; otherwise (and always on iPhone) it shows the steps.
export function InstallButtons({ app, signIn = 'sign in', className = '' }) {
  const { installed, canPrompt, install } = useInstall()
  const [show, setShow] = useState(null)
  if (installed) return null
  const badge = 'flex items-center gap-3 rounded-2xl border border-white/20 bg-black px-4 py-2.5 text-left text-white hover:border-white/40'
  return (
    <div className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${className}`}>
      <button type="button" onClick={async () => { if (!(canPrompt && await install())) setShow('android') }} className={badge}>
        <PhoneDownload className="size-8 shrink-0 text-emerald-400" />
        <span className="leading-tight"><span className="block text-xs uppercase tracking-wider text-slate-400">Install on</span><span className="text-lg font-semibold">Android</span></span>
      </button>
      <button type="button" onClick={() => setShow('ios')} className={badge}>
        <ShareIcon className="size-8 shrink-0 text-sky-400" />
        <span className="leading-tight"><span className="block text-xs uppercase tracking-wider text-slate-400">Install on</span><span className="text-lg font-semibold">iPhone</span></span>
      </button>
      {show && <Steps which={show} app={app} signIn={signIn} onClose={() => setShow(null)} />}
    </div>
  )
}

// Slim pair for a banner.
export function InstallButtonsSmall({ app, signIn = 'sign in' }) {
  const { canPrompt, install } = useInstall()
  const [show, setShow] = useState(null)
  return (
    <>
      <button type="button" onClick={async () => { if (!(canPrompt && await install())) setShow('android') }} className="rounded-full bg-white/10 px-3 py-1.5 font-semibold">Android</button>
      <button type="button" onClick={() => setShow('ios')} className="rounded-full bg-white/10 px-3 py-1.5 font-semibold">iPhone</button>
      {show && <Steps which={show} app={app} signIn={signIn} onClose={() => setShow(null)} />}
    </>
  )
}
