// Runs fn once the page's first contentful paint has happened (the built
// page arrives already drawn, so React can wait for it), or after `fallbackMs`
// in a tab that isn't being shown or a browser without paint timing.
export function afterFirstPaint(fn, fallbackMs = 1500) {
  let done = false
  const go = () => { if (!done) { done = true; fn() } }
  try {
    const po = new PerformanceObserver((list) => {
      if (list.getEntries().some((e) => e.name === 'first-contentful-paint')) { po.disconnect(); setTimeout(go) }
    })
    po.observe({ type: 'paint', buffered: true })
  } catch { setTimeout(go) }
  setTimeout(go, fallbackMs)
}
