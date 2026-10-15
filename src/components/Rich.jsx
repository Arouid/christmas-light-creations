import { LINK } from '../lib/rich.js'

// A content.js string with **bold** and [links](url) (lib/rich.js), drawn:
// policy pages, FAQ answers, the cost guide. Phone numbers never break across
// two lines (design review: “call 281-” / “819-0163”).
const PHONE = /(\d{3}-\d{3}-\d{4})/
const Phones = ({ text }) => text.split(PHONE).map((part, i) => (i % 2 ? <span key={i} className="whitespace-nowrap">{part}</span> : part))

function Links({ text }) {
  const out = []
  let last = 0
  for (const m of text.matchAll(LINK)) {
    out.push(<Phones key={`t${m.index}`} text={text.slice(last, m.index)} />, <a key={m.index} href={m[2]} className="underline underline-offset-2 hover:text-glow-300"><Phones text={m[1]} /></a>)
    last = m.index + m[0].length
  }
  out.push(<Phones key="end" text={text.slice(last)} />)
  return out
}

export default function Rich({ text }) {
  return String(text).split('**').map((part, i) => (i % 2 ? <strong key={i} className="text-slate-100"><Links text={part} /></strong> : <Links key={i} text={part} />))
}
