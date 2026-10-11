// "**bold**" in guide and tour text → <strong>.
export default function Rich({ text }) {
  return String(text).split('**').map((part, i) => (i % 2 ? <strong key={i} className="text-slate-100">{part}</strong> : part))
}
