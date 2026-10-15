// The Reports' Markdown files, read at build time (Vite `?raw`), so every push
// redraws them; keyed by their path in the repo (src/data/reports.js names
// them). Loaded with the Reports screen only (a lazy chunk).
import { parseMarkdown, rowsById } from '../../lib/markdown'
import winback from '../../../docs/marketing/winback-2026.md?raw'
import seasonPlan from '../../../docs/marketing/season-plan-2026.md?raw'
import competitors from '../../../docs/marketing/competitors-2026-10.md?raw'
import brandVoice from '../../../docs/marketing/brand-voice.md?raw'
import serpLog from '../../../docs/serp-log.md?raw'
import listings from '../../../docs/listings.md?raw'
import designReview from '../../../docs/reviews/design-2026-10.md?raw'
import designerAudit from '../../../docs/reviews/designer-2026-10.md?raw'
import todo from '../../../docs/TODO.md?raw'
import checklist from '../../../docs/test-checklist.md?raw'

const RAW = {
  'docs/marketing/winback-2026.md': winback,
  'docs/marketing/season-plan-2026.md': seasonPlan,
  'docs/marketing/competitors-2026-10.md': competitors,
  'docs/marketing/brand-voice.md': brandVoice,
  'docs/serp-log.md': serpLog,
  'docs/listings.md': listings,
  'docs/reviews/design-2026-10.md': designReview,
  'docs/reviews/designer-2026-10.md': designerAudit,
}

export const DOC_BLOCKS = Object.fromEntries(Object.entries(RAW).map(([path, md]) => [path, parseMarkdown(md)]))
export const TODO_ROWS = rowsById(parseMarkdown(todo))
export const CHECKLIST_ROWS = rowsById(parseMarkdown(checklist))
