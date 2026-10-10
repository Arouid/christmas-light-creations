import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BuildDay } from './prerendered'

// Draws a page into #root, or takes over the HTML the build already drew
// there (scripts/prerender.mjs; data-day = the day it was drawn). The dev
// server's page starts empty.
export function mount(Page) {
  const root = document.getElementById('root')
  const app = (
    <StrictMode>
      <BuildDay value={root.dataset.day ?? null}>
        <Page />
      </BuildDay>
    </StrictMode>
  )
  if (root.firstElementChild) hydrateRoot(root, app)
  else createRoot(root).render(app)
}
