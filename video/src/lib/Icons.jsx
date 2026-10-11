// Small stroke icons in the site's style (24-unit grid).
const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }

export function Icon({ name, size = 64, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} {...base}>
      {name === 'bulb' && (<><path d="M9 18h6M10 21h4M8.5 14.5a5.5 5.5 0 1 1 7 0c-.8.7-1.3 1.5-1.5 2.5h-4c-.2-1-.7-1.8-1.5-2.5Z" /></>)}
      {name === 'wrench' && (<><path d="M14.5 6.5a4 4 0 0 0 4.8 4.8l-9 9a1.8 1.8 0 0 1-2.6-2.6l9-9a4 4 0 0 1 4.6-4.8l-2.4 2.4 2.2 2.2 2.4-2.4" /></>)}
      {name === 'box' && (<><path d="M3 8l9-4 9 4-9 4-9-4ZM3 8v9l9 4 9-4V8M12 12v9" /></>)}
      {name === 'ladder' && (<><path d="M7 3v18M17 3v18M7 7h10M7 11h10M7 15h10M7 19h10" /></>)}
      {name === 'pin' && (<><path d="M12 21s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10Z" /><circle cx="12" cy="11" r="2.2" /></>)}
    </svg>
  )
}
