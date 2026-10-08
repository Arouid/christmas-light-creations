# Christmas Light Creations website

Mobile-first site for christmas-light-creations.com. React 19 + Vite + Tailwind CSS 4, hosted on GitHub Pages.

## Edit text, photos, FAQ, reviews

Everything lives in [`src/data/content.js`](src/data/content.js). Change it, commit, push to `main`, and the site redeploys in about a minute.

## Run locally

```bash
npm install
npm run dev
```

## Estimate form and Leads page

Form submissions are saved to Firebase (Firestore). Sales staff see them at `/leads/`, signed in with Google, and set a status (New, Called, Estimate sent, Booked, Lost) plus notes.

Until Firebase is set up, the form shows a "Call for your estimate" button and `/leads/` shows sample data.

### One-time Firebase setup

1. Go to console.firebase.google.com and create a project (Google Analytics: off).
2. **Build → Firestore Database → Create database** (production mode, region `us-central1` or nearest).
3. **Firestore → Rules**: paste the contents of [`firestore.rules`](firestore.rules) and Publish.
4. **Build → Authentication → Get started → Google** → Enable.
5. **Authentication → Settings → Authorized domains**: add `christmas-light-creations.com` (and `localhost` is there by default).
6. **Firestore → Data → Start collection** `staff`. Add one document per salesperson: **Document ID = their Google email in lowercase**, any field (e.g. `name`: their name).
7. **Project settings → Your apps → Web (`</>`)**: register an app, copy the `firebaseConfig` values into [`src/lib/firebase.js`](src/lib/firebase.js). These values are public by design; the rules protect the data.

To remove someone's access, delete their document from `staff`.

## Deploying (one-time setup)

1. Create a GitHub repo and push this folder to its `main` branch.
2. Repo **Settings → Pages → Source: GitHub Actions**.
3. Same page, **Custom domain**: `christmas-light-creations.com`, then tick **Enforce HTTPS** once it's available.
4. In GoDaddy DNS for the domain:
   - Delete the existing `A` records for `@`, then add four `A` records for `@`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - Set `CNAME` for `www` to `<your-github-username>.github.io`

Old WordPress URLs (`/faq/`, `/photos/`, `/info/`, `/get-an-estimate/`) redirect to the matching section.
