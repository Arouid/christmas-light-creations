import { LINK } from '../lib/rich.js'

// A content.js string with **bold** and [links](url) (lib/rich.js), drawn:
// policy pages, FAQ answers, the cost guide.
function Links({ text }) {
  const out = []
  let last = 0
  for (const m of text.matchAll(LINK)) {
    out.push(text.slice(last, m.index), <a key={m.index} href={m[2]} className="underline underline-offset-2 hover:text-glow-300">{m[1]}</a>)
    last = m.index + m[0].length
  }
  out.push(text.slice(last))
  return out
}

export default function Rich({ text }) {
  return String(text).split('**').map((part, i) => (i % 2 ? <strong key={i} className="text-slate-100"><Links text={part} /></strong> : <Links key={i} text={part} />))
}
