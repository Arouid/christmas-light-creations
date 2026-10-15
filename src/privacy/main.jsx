import '../index.css'
import { mount } from '../lib/mount.jsx'
import PrivacyPage from './PrivacyPage.jsx'

// The built page arrives already drawn (scripts/prerender.mjs), so search engines and assistants
// that don't run JavaScript read it too; React takes it over (lib/mount.jsx).
mount(PrivacyPage)
