import { termsOfUse } from '../data/content'
import PolicyPage from '../components/PolicyPage'

// Terms of use: /terms/ (linked in every footer and under the designer).
// Words in content.js. Not the installation agreement (src/proposals/terms.js).
export default function TermsPage() {
  return <PolicyPage title="Terms of use" doc={termsOfUse} />
}
