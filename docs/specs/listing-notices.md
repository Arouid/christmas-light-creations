# Nextdoor and Yelp notices in 💬

> Status: built 2026-10-15 (owner, through the SEO session: "have nextdoor messages appear in our notifications", then "yelp and nextdoor are connected to info@"). Needs the owner's `messageSync`, `staffNudge` and `dailyHealth` deploy (TODO #82). No rules change, no Apps Script paste.

## The problem

The Nextdoor business page is on info@ (2026-10-15). Yelp was on the owner's own email at first; he switched its notification email to info@ the same day, so both sites' notices reach the sync. When a neighbor messages the Nextdoor page, recommends us, comments on our post or mentions us, or someone messages us or sends a Request a Quote on Yelp, that site emails info@. The message sync (`docs/specs/message-sync.md`) dropped every nextdoor.com and yelp.com email as service mail (`SERVICE_DOMAINS`), so nobody in the staff app saw them; they sat in info@'s Gmail. On Yelp a slow answer to a quote request loses the job.

## What we want

- Within about 5 minutes (the Apps Script's timer), each such notice shows in **💬** as 🏘️ **Nextdoor** or 📍 **Yelp** from the person's name as the site shows it ("A neighbor" / "A Yelp customer" without one), with what it is (New message, New recommendation, Comment on your post, Mentioned you, Quote request) and their words. It buzzes staff phones like a text, counts as "Needs someone" until **I've got it**, and the hourly still-waiting nudge counts it.
- It sits in **Leads → messages from people we don't know yet** with **Answer on Nextdoor ↗** (nextdoor.com) or **Answer on Yelp ↗** (biz.yelp.com), each in a new tab, and **Done**. No Call, Text, Reply in Gmail, Link to customer, 🚫 Spam or Suggest a reply: the answer happens on that site, and there's no number or address to link or block.
- Everything else from those sites stays dropped, as before: Nextdoor's digests, "near you", welcome and marketing mail; Yelp's stats, tips, ads offers, "you missed leads" upsells and review notices (we never ask for Yelp reviews, and the owner reads reviews on Yelp).

## How

- `functions/listingNotices.js` (pure, `tests/listingNotices.test.mjs`): `PLATFORMS` (label, icon, where to answer, the name for someone unnamed, sender domain, the notice types, the subjects that are never a person) and `listingNotice({ from, subject, body })` → `{ platform, type, word, who, text }` or null. Sender on nextdoor.com / yelp.com or a subdomain; a never-subject → null; the type from the subject. `who` from the From display name ("Jane D. via Nextdoor"), else the subject ("Jane D. sent you a message", "New message from Jane D."). `text`: the body without any link (both sites' links can carry sign-in tokens), cut at the first button or footer line, at most 600 characters.
- `functions/messageSync.js`: `parseEmail` asks `listingNotice` before the junk rules; a notice becomes `{ source: <site>, kind: <site>, direction: 'in', subject: <word>, name: <who>, notice: <type>, text }`, and `docsFor` files it once as `messages/em-<hash of Message-ID>-<site>` with `unmatched: true` (no `email`, no `phone`). A re-sent email is a duplicate (same id).
- `functions/staffPush.js` (re-exports `PLATFORMS` to the app): `KIND_WORD.nextdoor = 'Nextdoor'`, `KIND_WORD.yelp = 'Yelp'`; the preview starts with the subject (as for emails); `whoOf` uses the site's "someone". The 💬 list, the push, the nudge and Handling all read these.
- Staff app: `MessagesPanel.jsx` (the site's icon, no "unknown number", no Suggest a reply), `UnmatchedMessages.jsx` (the buttons above), `TextHistory.jsx` labels, two demo items in `demoData.js`, the guide's "Someone wrote to us on Nextdoor or Yelp", the 📣 Marketing daily Nextdoor line, the privacy page.

## What we DON'T do

| Never | Why |
|---|---|
| Reply, post or recommend from the app | Neither site has an API for this; answers happen there, by a person |
| Keep links from the email | They can carry sign-in tokens |
| Keep digests, stats, tips, upsells, Yelp review notices | Not a person writing to us |
| Guess an unknown notice shape | An email that matches no type stays dropped, as before; the 7 am Chrome check (`nextdoor-morning-check`) still sees Nextdoor |

## Not confirmed yet

The subject patterns were written from the sites' usual wording on 2026-10-15; no real notice had reached info@ (info@ isn't signed in to the owner's Chrome, so none was read). The live check: the owner messages the Nextdoor page from his personal Nextdoor account and sends a Request a Quote or a message from a personal Yelp account; each 🏘️ / 📍 item shows in 💬 within 10 minutes (`docs/test-checklist.md` #170). If one doesn't: the email is still in info@'s Gmail; send Claude its sender and subject line, and the pattern gets added with a test.

## Acceptance

1. [test] Nextdoor message, recommendation, comment, mention and Yelp quote request and message kept with who and words; digests, welcome, stats, tips, upsells and review notices dropped; other senders ignored; no link, token or footer in the text; 600-character cap; the sync's one Unmatched doc with exactly the listed fields; the push "Nextdoor from <name>" / "Yelp from <name>". → `tests/listingNotices.test.mjs`
2. [Claude, browser] `/leads/?demo` at 375 px: 💬 shows 🏘️ Sample N. and 📍 Sample Y. with I've got it and no Suggest a reply; the Unmatched box shows Answer on Nextdoor ↗ / Answer on Yelp ↗ (new tab) and Done; no sideways scroll.
3. [owner, live] Checklist #170.
