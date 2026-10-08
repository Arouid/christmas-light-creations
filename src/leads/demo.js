import { firebaseReady } from '../lib/firebase'

// Sample data instead of Firebase: when Firebase isn't configured, or in local
// development with ?demo in the URL (lets the UI be checked without signing in).
export const demoMode = !firebaseReady
  || (import.meta.env.DEV && new URLSearchParams(window.location.search).has('demo'))
