import '../index.css'

// The built page arrives already drawn (scripts/prerender.mjs), so React
// isn't needed to show it: the small entry runs first, then React loads and
// takes the page over (lib/mount.jsx). (Not requestAnimationFrame: it never
// fires in a tab that isn't being shown.)
setTimeout(async () => {
  const [{ mount }, { default: DesignPage }] = await Promise.all([import('../lib/mount.jsx'), import('./DesignPage.jsx')])
  mount(DesignPage)
})
