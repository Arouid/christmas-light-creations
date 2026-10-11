# Customer app (Android and iPhone)

Owner's ask (2026-10-11): "a customer-facing Android application for customer logins."

The account page at `/account/` **is** the app. It's installed on a phone as a web app today (no store), and the Google Play listing is a *Trusted Web Activity*: an Android app that is this same page, full-screen, with no browser bar. Nothing is written twice; every change to `/account/` is a change to the app.

## What's live (phase 1: install from the page)

| Piece | File | Notes |
|---|---|---|
| Web app manifest | `public/account/manifest.webmanifest` | name *Christmas Light Creations*, home-screen label *CLC Lights*, `scope`/`start_url` `/account/`, standalone, navy theme |
| Icons | `public/account/icons/` (`icon-192`, `icon-512`, `maskable-512`, `apple-touch-icon`) | made by `node scripts/make-account-icons.mjs` from `assets-source/logo-vector/clc-cottage-tile-1080.png`; the maskable one keeps the cottage in the middle 70% (Android cuts a circle out of it) |
| Service worker | `public/account/sw.js` | registered by `src/account/main.jsx`; caches only `offline.html`; navigations fall back to it with no network. Chrome needs a fetch handler before it offers one-tap install |
| Offline page | `public/account/offline.html` | "You're offline" + Try again + call |
| Get the app box | `AccountPage.jsx` → `GetTheApp` | on the signed-in account, hidden inside the installed app; buttons and steps shared with the staff app in `src/components/InstallApp.jsx` |
| Test | `tests/installManifests.test.mjs` | both manifests complete, icons on disk, worker present |

How it installs:

- **Android (Chrome)**: *Install on Android* opens Chrome's install sheet when Chrome offers it (`beforeinstallprompt`); otherwise the steps (⋮ → Install app). The installed app shares Chrome's storage, so a customer signed in on the page stays signed in; emailed sign-in links open in Chrome and sign the app in too.
- **iPhone (Safari)**: steps only (Share → Add to Home Screen). The home-screen app has its own storage: they sign in again inside it. Emailed links open in Safari, not the app, so the sign-in form says *Sign in with Google is the one that works* there. Google sign-in uses the redirect flow in standalone mode (`src/lib/googleSignIn.js`), the same fix as the staff app.
- Payments: the same PayPal buttons; checklist #75 covers paying from inside the installed app.

## Phase 2: Google Play listing (Trusted Web Activity)

Needs the owner first:

1. **Google Play developer account** at play.google.com/console ($25 once, identity check). A *personal* account made after Nov 2023 must run a **closed test with at least 12 testers opted in for 14 continuous days** before it can publish to production (Google: [support.google.com/googleplay/android-developer/answer/14151465](https://support.google.com/googleplay/android-developer/answer/14151465)); an *organization* account needs a D-U-N-S number and skips that at last check. Crew, family and a dozen customers make fine testers. Check the current rule in Play Console when creating the account.

Then Claude builds it (owner says go):

2. `npx @bubblewrap/cli init --manifest=https://christmas-light-creations.com/account/manifest.webmanifest` in a folder outside this repo (first run downloads a JDK and the Android SDK, about 1 GB). Answers: package `com.christmaslightcreations.account`, app name *Christmas Light Creations*, launcher name *CLC Lights*, navy theme, a new signing keystore (kept **out of git**; the owner holds its passwords).
3. `bubblewrap build` → `app-release-signed.apk` (phone test) and `app-release-bundle.aab` (Play upload).
4. `bubblewrap fingerprint generateAssetLinks` → `public/.well-known/assetlinks.json` (package name + the key's SHA-256). This is what makes the app open full-screen instead of as a Chrome tab. After the first upload with Play App Signing, add Play's *app signing* certificate fingerprint to the same file (both fingerprints stay).
5. Phone test: `adb install app-release-signed.apk` (USB debugging on) → opens with no browser bar once the asset links verify.
6. Play Console: new app → upload the `.aab` to Closed testing → listing: name, short and long description, 512 icon (`icon-512.png`), feature graphic 1024×500, at least two phone screenshots (account signed in, a proposal), privacy policy `https://christmas-light-creations.com/privacy/`, Data safety form (name and email for the account, payments by PayPal, no ads, no tracking), content rating questionnaire. Testers opt in by link; after the 14 days, apply for production.
7. Later updates: the app loads the live site, so a new `.aab` is only needed when the manifest, icon or package changes.

Sources: Chrome's [install criteria](https://developer.chrome.com/blog/update-install-criteria) (menu install needs no service worker; the one-tap prompt still needs a fetch handler) and the [Trusted Web Activity quick start](https://developer.chrome.com/docs/android/trusted-web-activity/quick-start).

## Not doing

A native (Kotlin) app: every screen would exist twice and the sign-in, PayPal and proposal logic would be copied. The web app already works on both phones; the store listing is a wrapper around it.
