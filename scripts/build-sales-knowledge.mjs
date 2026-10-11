// What the sales assistant (functions/salesAssistant.js, docs/specs/sales-assistant.md)
// knows about the business, pulled from the site's own copy so it can't drift
// from what customers read. Firebase deploys only the functions/ folder, so
// the result is written to functions/salesKnowledge.json (committed); a test
// fails `npm run check` when it's stale. Run: node scripts/build-sales-knowledge.mjs
import { writeFile } from 'node:fs/promises'
import { salesKnowledge } from '../src/lib/salesKnowledge.js'

const out = new URL('../functions/salesKnowledge.json', import.meta.url)
await writeFile(out, `${JSON.stringify(salesKnowledge(), null, 2)}\n`)
console.log('functions/salesKnowledge.json written')
