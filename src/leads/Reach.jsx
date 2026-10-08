import { useState } from 'react'
import { gmailUrl, voiceUrl } from '../lib/messages'
import Icon from '../components/Icon'

export const pill = 'inline-flex items-center justify-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/15'

// Google Voice can't take a pre-written message, so we copy it to the
// clipboard and open the conversation; staff paste (Ctrl+V / long-press) and send.
export function TextButton({ phone, message, label = 'Text', className = pill, onSent }) {
  const [copied, setCopied] = useState(false)
  if (!phone) return null

  async function go(e) {
    e.stopPropagation()
    if (message) {
      try {
        await navigator.clipboard.writeText(message)
        setCopied(true)
        setTimeout(() => setCopied(false), 6000)
      } catch { /* clipboard blocked: Voice still opens */ }
    }
    window.open(voiceUrl(phone), '_blank', 'noopener')
    onSent?.()
  }

  return (
    <button type="button" onClick={go} className={className} title="Opens Google Voice (business number)">
      <Icon name="chat" className="size-4" />
      {copied ? 'Copied: paste in Voice' : label}
    </button>
  )
}

export function EmailButton({ to, subject, body, label = 'Email', className = pill, onSent }) {
  if (!to) return null
  return (
    <a href={gmailUrl({ to, subject, body })} target="_blank" rel="noreferrer" className={className}
      onClick={(e) => { e.stopPropagation(); onSent?.() }} title="Opens Gmail as info@">
      {label}
    </a>
  )
}
