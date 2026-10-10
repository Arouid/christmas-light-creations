import { useEffect } from 'react'

// Move keyboard focus into a panel or dialog when it opens (screen readers
// then read it), and put it back where it was when it closes.
export function useFocusOnOpen(ref, open) {
  useEffect(() => {
    if (!open || !ref.current) return
    const before = document.activeElement
    const el = ref.current
    const first = el.matches('[tabindex], button, a[href], input, select, textarea') ? el
      : el.querySelector('[tabindex], button, a[href], input, select, textarea')
    ;(first ?? el).focus({ preventScroll: true })
    return () => { if (before instanceof HTMLElement && document.contains(before)) before.focus({ preventScroll: true }) }
  }, [ref, open])
}
