// The season's drafts, read from docs/marketing/ at build time (one place for the words;
// src/lib/marketingDocs.js parses them).
import { DRAFT_DOCS } from '../../data/marketingPlan'
import { parseDraftDoc } from '../../lib/marketingDocs'
import gbpMd from '../../../docs/marketing/google-business-posts.md?raw'
import socialMd from '../../../docs/marketing/social-posts.md?raw'
import adsMd from '../../../docs/marketing/google-ads-copy.md?raw'
import emailMd from '../../../docs/marketing/rebook-email.md?raw'

const RAW = { gbp: gbpMd, social: socialMd, ads: adsMd, email: emailMd }
export const DOCS = Object.fromEntries(Object.keys(DRAFT_DOCS).map((k) => [k, parseDraftDoc(RAW[k])]))
