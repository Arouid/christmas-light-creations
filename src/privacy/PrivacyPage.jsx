import { privacy } from '../data/content'
import PolicyPage from '../components/PolicyPage'

// Privacy policy: /privacy/ (linked in every footer). Words in content.js.
export default function PrivacyPage() {
  return <PolicyPage title="Privacy" doc={privacy} />
}
