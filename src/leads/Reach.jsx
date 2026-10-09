import { useState } from 'react'
import { voiceUrl } from '../lib/messages'
import Icon from '../components/Icon'
import { useVoiceAccount } from './voice'

export const pill = 'inline-flex items-center justify-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/15'

function CopyRow({ label, value, multiline }) {
  const [done, setDone] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setDone(true)
      setTimeout(() => setDone(false), 3000)
    } catch { /* clipboard blocked: the text is still selectable */ }
  }
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
      <div className="mt-1 flex items-start gap-2">
        <p className={`min-w-0 flex-1 select-all rounded-xl bg-night-950 px-3 py-2 text-sm ${multiline ? 'whitespace-pre-wrap' : 'font-mono'}`}>{value}</p>
        <button type="button" onClick={copy} className="shrink-0 rounded-full bg-glow-400 px-4 py-2 text-sm font-semibold text-night-950">
          {done ? 'Copied ✓' : 'Copy'}
        </button>
      </div>
    </div>
  )
}

// Google Voice has no link that starts a new text with the number and message
// filled in. Its conversation link only works for numbers already texted, so
// we show the number and message to copy, plus a button to open Voice.
export function TextButton({ phone, message, label = 'Text', className = pill, onSent }) {
  const [open, setOpen] = useState(false)
  const account = useVoiceAccount()
  if (!phone) return null

  function openVoice() {
    window.open(voiceUrl(phone, account), '_blank', 'noopener')
    onSent?.()
  }

  return (
    <>
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(true) }} className={className}>
        <Icon name="chat" className="size-4" /> {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-night-950/80 p-4 backdrop-blur" role="dialog" aria-modal="true"
          aria-label="Text with Google Voice" onClick={(e) => { e.stopPropagation(); setOpen(false) }}>
          <div className="w-full max-w-md space-y-4 rounded-3xl border border-white/10 bg-night-900 p-5 text-left" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Text with Google Voice</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-slate-400">✕</button>
            </div>
            <CopyRow label="To" value={phone} />
            {message && <CopyRow label="Message" value={message} multiline />}
            <button type="button" onClick={openVoice} className="w-full rounded-full bg-white py-3 font-semibold text-night-950">
              Open Google Voice{account ? '' : ' (my own)'}
            </button>
            <p className="text-xs text-slate-400">
              Opens the conversation if you’ve texted this number before. If Voice shows none: <strong>Send new message</strong> → paste the number → paste the message → send.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
