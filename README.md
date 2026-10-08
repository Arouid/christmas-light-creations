# Christmas Light Creations website

Mobile-first site for christmas-light-creations.com. React 19 + Vite + Tailwind CSS 4, hosted on GitHub Pages.

## Edit text, photos, FAQ, reviews

Everything lives in [`src/data/content.js`](src/data/content.js). Change it, commit, push to `main`, and the site redeploys in about a minute.

## Run locally

```bash
npm install
npm run dev
```

## Estimate form

GitHub Pages can't process forms itself, so submissions go to a form service (e.g. [Formspree](https://formspree.io), free tier). Create a form there, then in the GitHub repo go to **Settings → Secrets and variables → Actions → Variables** and add `VITE_FORM_ENDPOINT` = your form URL (e.g. `https://formspree.io/f/abcd1234`). Until it's set, the form shows a "Call for your estimate" button instead.

## Deploying (one-time setup)

1. Create a GitHub repo and push this folder to its `main` branch.
2. Repo **Settings → Pages → Source: GitHub Actions**.
3. Same page, **Custom domain**: `christmas-light-creations.com`, then tick **Enforce HTTPS** once it's available.
4. In GoDaddy DNS for the domain:
   - Delete the existing `A` records for `@`, then add four `A` records for `@`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - Set `CNAME` for `www` to `<your-github-username>.github.io`

Old WordPress URLs (`/faq/`, `/photos/`, `/info/`, `/get-an-estimate/`) redirect to the matching section.
