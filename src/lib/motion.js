// Scrolling for people who turned on "reduce motion" in their phone or
// computer's settings: jump instead of glide. Use as
// el.scrollIntoView({ behavior: scrollMotion(), … }).
export const scrollMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
