import { InstallButtons as Buttons, InstallButtonsSmall as ButtonsSmall } from '../components/InstallApp'
import { useInstall } from '../components/useInstall'

// Install the CLC Staff app on a phone's home screen. The buttons, the steps
// and the install hook are shared with the customers' app
// (src/components/InstallApp.jsx); this file only names the staff app.
const STAFF = { app: 'CLC Staff', signIn: 'sign in with Google' }

export const InstallButtons = (props) => <Buttons {...STAFF} {...props} />

// Settings box, or a slim dismissible banner on phones.
export default function InstallApp({ compact = false, onDismiss }) {
  const { installed } = useInstall()
  if (installed) return compact ? null : <p className="text-sm text-emerald-400">✓ You’re using the installed CLC Staff app.</p>
  if (compact) {
    return (
      <div className="flex items-center gap-3 bg-night-800 px-4 py-2.5 text-sm">
        <span className="flex-1 text-slate-300">Get the CLC Staff app on your phone.</span>
        <ButtonsSmall {...STAFF} />
        {onDismiss && <button type="button" onClick={onDismiss} aria-label="Dismiss" className="px-1 text-slate-400">✕</button>}
      </div>
    )
  }
  return (
    <div className="space-y-3">
      <p className="font-semibold">Get the CLC Staff app</p>
      <p className="text-sm text-slate-400">Puts CLC Staff on your home screen like any other app: opens full-screen, signs in with your Google account, always up to date.</p>
      <InstallButtons />
    </div>
  )
}
