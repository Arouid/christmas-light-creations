// Decorations drawn for the gift-wrapping page (docs/specs/gift-wrapping.md):
// a satin bow and a sprig of holly, in the berry and pine theme colours. Our
// own drawings, decorative only (aria-hidden); every wrapped gift shown on the
// page is the owner's own photo.

// The bow: its knot sits at (60, 34) of the 120 × 90 box, so a ribbon band
// can run through it.
export function Bow({ className = '' }) {
  return (
    <svg viewBox="0 0 120 90" className={className} aria-hidden="true" focusable="false">
      <path d="M55 38 34 80l8-4 3 9 18-44Z" fill="#b51d31" />
      <path d="M65 38 86 80l-8-4-3 9-18-44Z" fill="#a01a2c" />
      <path d="M60 34C46 12 10 2 6 22c-3 20 32 24 54 12Z" fill="#d7263d" />
      <path d="M60 34c14-22 50-32 54-12 3 20-32 24-54 12Z" fill="#d7263d" />
      <path d="M59 33C48 22 24 14 20 24c-3 9 20 13 39 9Z" fill="#8f1526" />
      <path d="M61 33c11-11 35-19 39-9 3 9-20 13-39 9Z" fill="#8f1526" />
      <path d="M14 16c10-8 28-4 38 6M106 16c-10-8-28-4-38 6" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="2" strokeLinecap="round" />
      <rect x="51" y="25" width="18" height="18" rx="6" fill="#b51d31" />
      <path d="M55 29c3-2 7-2 10 0" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

const LEAF = 'M0 0Q6-1 8-7q3 3 8-4 3 5 9-1 3 7 13 8-4 4 2 7-9 0-9 7-6-4-10 2-5-6-10-2-4-6-11-10Z'

// Two holly leaves and three berries.
export function Holly({ className = '' }) {
  return (
    <svg viewBox="-44 -24 88 36" className={className} aria-hidden="true" focusable="false">
      {[-155, -25].map((r) => (
        <g key={r} transform={`rotate(${r})`}>
          <path d={LEAF} fill="#1f8a5b" />
          <path d="M1 0q17 0 36 0" stroke="#156b45" strokeWidth="1.1" fill="none" strokeLinecap="round" />
        </g>
      ))}
      <circle cx="-4.5" cy="3" r="5" fill="#d7263d" />
      <circle cx="4.5" cy="4" r="5" fill="#b51d31" />
      <circle cx="0" cy="-3.5" r="5" fill="#d7263d" />
      <path d="M-6 1.5h0M-1.5-5h0M3 2.5h0" stroke="#fff" strokeOpacity=".75" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  )
}
