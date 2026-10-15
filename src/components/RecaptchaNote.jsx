import { recaptchaNote as n } from '../data/content'
import { APP_CHECK_SITE_KEY } from '../lib/firebase'

// Google's required notice when the reCAPTCHA badge is hidden (App Check on).
// muted: its text colour (darker on the white gift-wrapping page).
export default function RecaptchaNote({ className = '', muted = 'text-slate-400' }) {
  if (!APP_CHECK_SITE_KEY) return null
  return (
    <p className={`text-center text-xs ${muted} print:hidden ${className}`}>
      {n.before}<a href={n.privacy} className="underline">Privacy Policy</a> and <a href={n.terms} className="underline">Terms of Service</a>{n.after}
    </p>
  )
}
