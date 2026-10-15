# Nextdoor notices in 💬

> Status: built 2026-10-15 (owner, through the SEO session: "have nextdoor messages appear in our notifications"). Needs the owner's `messageSync`, `staffNudge` and `dailyHealth` deploy (TODO #82). No rules change, no Apps Script paste.

## The problem

The Nextdoor business page "Christmas Light Creations" went up 2026-10-15 under info@. When a neighbor messages the page, recommends us, comments on our post or mentions us, Nextdoor emails info@. The message sync (`docs/specs/message-sync.md`) dropped every nextdoor.com email as service mail (`SERVICE_DOMAINS`), so nobody in the staff app saw them; they sat in info@'s Gmail.

## What we want

- Within about 5 minutes (the Apps Script's timer), each such notice shows in **💬** as 🏘️ **Nextdoor** from the neighbor's name as Nextdoor shows it ("A neighbor" without one), with what it is ("New message", "New recommendation", "Comment on your post", "Mentioned you") and their words. It buzzes staff phones like a text, counts as "Needs someone" until **I've got it**, and the hourly still-waiting nudge counts it.
- It sits in **Leads → messages from people we don't know yet** with **🏘️ Answer on Nextdoor ↗** (opens nextdoor.com in a new tab) and **Done**. No Call, Text, Reply in Gmail, Link to customer, 🚫 Spam or Suggest a reply: the answer happens on Nextdoor, and there's no number or address to link or block.
- Nextdoor's digests, "near you", welcome and marketing mail stay dropped, as before.

## How

- `functions/nextdoor.js` (pure, `tests/nextdoor.test.mjs`): `nextdoorNotice({ from, subject, body })` → `{ type, word, who, text }` or null. Sender on nextdoor.com or a subdomain; a digest-looking subject → null; the type from the subject (sent you a message / new message / messaged you · recommended your business / new recommendation · commented on your post / replied to your post · mentioned your business). `who` from the From display name ("Jane D. via Nextdoor"), else the subject ("Jane D. sent you a message"). `text`: the body without any link (Nextdoor's links can carry sign-in tokens), cut at the first button or footer line, at most 600 characters.
- `functions/messageSync.js`: `parseEmail` asks `nextdoorNotice` before the junk rules; a notice becomes `{ source: 'nextdoor', kind: 'nextdoor', direction: 'in', subject: <word>, name: <who>, notice: <type>, text }`, and `docsFor` files it once as `messages/em-<hash of Message-ID>-nextdoor` with `unmatched: true` (no `email`, no `phone`). A re-sent email is a duplicate (same id).
- `functions/staffPush.js`: `KIND_WORD.nextdoor = 'Nextdoor'`; the preview starts with the subject (as for emails); `whoOf` says "A neighbor" without a name. The 💬 list, the push, the nudge and Handling all read these.
- Staff app: `MessagesPanel.jsx` (🏘️, no "unknown number", no Suggest a reply), `UnmatchedMessages.jsx` (the buttons above), `TextHistory.jsx` (🏘️ Nextdoor label), a demo item in `demoData.js`, the guide's "A neighbor wrote to us on Nextdoor", the 📣 Marketing daily line.

## What we DON'T do

| Never | Why |
|---|---|
| Reply, post or recommend from the app | Nextdoor has no API for business pages; answers happen there, by a person |
| Keep links from the email | They can carry Nextdoor sign-in tokens |
| Keep digests or neighborhood posts | Not addressed to us; the 7 am Chrome check (`nextdoor-morning-check`) reads "who does Christmas lights" posts |
| Guess an unknown notice shape | An email that matches none of the four types stays dropped, as before; the morning check still sees it on Nextdoor |

## Not confirmed yet

The four subject patterns were written from Nextdoor's usual wording on 2026-10-15; no real notice had reached info@ (info@ isn't signed in to the owner's Chrome, so none was read). The live check: the owner messages the business page from his personal Nextdoor account and the 🏘️ item shows in 💬 within 10 minutes (`docs/test-checklist.md` #170). If it doesn't: the email is still in info@'s Gmail; send Claude its sender and subject line, and the pattern gets added with a test.

## Acceptance

1. [test] Message, recommendation, comment, mention kept with who and words; digest, welcome and a "neighbors near you" subject dropped; non-Nextdoor senders ignored; no link, token or footer in the text; 600-character cap; the sync's one Unmatched doc with exactly the listed fields; the push "Nextdoor from <name>". → `tests/nextdoor.test.mjs`
2. [Claude, browser] `/leads/?demo` at 375 px: 💬 shows 🏘️ Sample N. · Nextdoor · "New message · Hi! Do you still have dates…" with I've got it and no Suggest a reply; the Unmatched box shows Answer on Nextdoor ↗ (new tab) and Done; no sideways scroll.
3. [owner, live] Checklist #170.
