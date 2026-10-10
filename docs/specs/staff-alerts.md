# New-message alerts for staff (💬 badge + phone notifications)

> Status: live 2026-10-09 (rules published, web push key set, messageSync + sendTestPush deployed, site pushed); owner's phone test pending · Decided on 2026-10-09 by Scott (Finess): "Badge + push"

## The problem

Customer texts, voicemails, missed calls and emails to info@ are filed into the staff app every ~5 minutes (`docs/specs/message-sync.md`), but nothing tells staff that something arrived. You only see it if you happen to open that customer's history or the Unmatched list on Leads. Google Voice and the info@ Gmail app do buzz the phones signed in to those accounts, but they show a bare number (not the customer), don't open the customer's account, and only reach whoever is signed in to those accounts.

## What we want

**In the app (everyone, every device):**

- A **💬 button** in the staff app header, on every tab, with a red count of **new** incoming messages: texts, voicemails, missed calls and emails that customers (or unknown numbers) sent and that arrived **since you last opened the list**. Per staff member (same count on your phone and computer), not shared: Scott opening it doesn't clear it for Katie.
- Tap it: **New messages** list, newest first, last 7 days. Each row: who (customer or lead name; unknown numbers as the number), what (text / voicemail / missed call / email), a short preview, when. New ones are marked. Tap a row → that person's account (Accounts page, with their full history); unknown numbers → the Unmatched list on Leads.
- Opening the list clears the count (for you).
- On an installed app, the home-screen icon shows the count too where the phone supports it.

**On the phone (opt-in, per device):**

- At the top of the list: **Phone notifications on this device** with **Turn on** / **Turn off** and **Send a test**.
- Once on, the phone shows a notification within about 5 minutes of a customer message (the sync's pace): "Text from Sample Customer" + the first words. Several at once → one notification ("3 new customer messages: Sample Customer, (281) 555-0166, …"). Tapping it opens the app on that account (or on the list when there were several).
- iPhone/iPad: only works in the app **added to the Home Screen** (Safari → Share → Add to Home Screen) on iOS 16.4 or later; in plain Safari the panel says so instead of a Turn on button. Android and computers: Chrome, Edge, Firefox; Safari on Mac.
- Every staff member who turned it on, on each device they turned it on, gets every alert (small team; no per-person routing).

## What we DON'T do

- **No alert for our own outgoing messages** (sent from info@ or the app): direction `out` never counts.
- **No alerts from imports** (Voice Takeout, old history): only what the live sync files.
- **No email alert per message** (option (b), not chosen: Gmail already notifies).
- **No per-message "read" state** shared across staff, no assigning a message to someone, no replying from the list (texting stays in Voice, decision 2026-10-08).
- **No quiet hours** in the app: use the phone's Do Not Disturb / Focus.
- **No alert for website estimate requests** here: they already email the alert list (`newLeadAlert`). Could be added to push later.
- **No offline caching** in the service worker: it only shows notifications; the app always loads fresh.
- Emails that match nobody aren't stored by the sync, so they never alert (unchanged from message-sync).

## Edge cases

- **Never opened the list**: everything from the last 7 days counts as new.
- **Rules not published yet** (new `staffPrefs` collection refused): the 💬 list still works, the count is kept on this device only, and the notifications section says the database rules need publishing. Never locks anyone out.
- **Web push key not set yet** (`PUSH_VAPID_KEY` empty): notifications section says "not set up yet"; the list works.
- **Permission blocked** in the browser/phone settings: says so and how to undo; no button that can't work.
- **A phone is reset, the app is removed or notifications are turned off in phone settings**: FCM answers "unregistered" on the next send and the server drops that device; nothing to clean by hand.
- **Same device registered twice** (cleared site data): sent once (devices de-duplicated by id).
- **Burst** (the sync catches up after downtime): one notification per sync call, not one per message. Messages more than 2 days old (by their own time) never buzz phones; they still show in the list.
- **Push service down / FCM refuses everything**: the sync still saves the messages (alerts never break the sync); a "Phone notifications didn't go out" website problem is raised at most once every 6 hours.
- **App open when a notification arrives**: the notification still shows (simplest, and the count updates live anyway).
- **Two staff link/dismiss an unmatched message**: dismissed ones drop out of the list and the count.

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-10-09 | Badge + list in the app **and** phone push (owner: "Badge + push") | Owner's choice |
| 2026-10-09 | Push via Firebase Cloud Messaging with **Firebase Installation IDs** (`register`/`onRegistered` in the web SDK 13); the server sends with the FCM HTTP v1 REST API (`message.fid`) using the function's own Google credential | Current Firebase docs deprecate `getToken` tokens. firebase-admin 13 (ours) can't send to an FID and 14 is a major upgrade touching every function, so a small REST call instead |
| 2026-10-09 | Our own small service worker (`/leads/sw.js`, scope `/leads/`) shows the notification from **data-only** messages; no Firebase code in it | Full control of the text and the tap; nothing loaded from outside; no double notifications |
| 2026-10-09 | Alerts are sent from `messageSync` right after it saves, one per call, not from a Firestore trigger | Only the live sync alerts (imports never do); one summary per batch instead of a burst |
| 2026-10-09 | Notification shows the customer's name and the first ~120 characters | Same as what Google Voice already shows on the lock screen; the phone's own lock-screen settings can hide previews. Owner can ask for "name only" |
| 2026-10-09 | "New" = arrived (`syncedAt`) after you last opened the list; kept per person in `staffPrefs/{email}` | Same count on all your devices; doesn't depend on the phone's clock |
| 2026-10-09 | One new collection `staffPrefs/{email}`: each staff member reads/writes only their own doc | Per-person state; the server reads all to find devices |
| 2026-10-09 | Project web push key (VAPID) generated in the Firebase console, public half in `src/lib/firebase.js` | The SDK's default key isn't accepted by every push service (SDK docs) |

## Acceptance criteria

1. [test] Push text: one message → "Text/Voicemail/Missed call/Email from <name or number>" + preview ≤ 120 chars, link to its account (`#accounts/customer/…`, `#accounts/lead/…`) or `#leads` (unmatched); several → "N new customer messages" + names, link `#messages`; outgoing, dismissed and >2-day-old messages ignored; nothing left → no push. → `tests/staffAlerts.test.mjs`
2. [test] Devices: collected from every `staffPrefs` doc, de-duplicated; FCM 404 `UNREGISTERED` / `SENDER_ID_MISMATCH` marks a device gone, a 500 or a bad payload doesn't. → same file
3. [test] In-app list: last 7 days, incoming only, not dismissed, newest first; new count uses `syncedAt` vs your seen time (Firestore timestamp, Date, ISO or ms); no seen time → all count. Push-section state for: no support, iPhone not on Home Screen, blocked, no key, rules refused, off, on. → same file
4. [test] Rules: staff read/write only their own `staffPrefs` doc (stamped, known keys, ≤ 10 devices); other staff and outsiders refused. → `npm run test:rules`
5. [agent] `messageSync` still answers the same counts when alerts fail (alerts in a try/catch after saving); logs only counts, never message text, numbers or addresses. → read `functions/index.js`
6. [human] `/leads/?demo` at 375px: 💬 shows a count; the list shows the sample messages with names; tapping one opens that account; reopening shows no count; no horizontal scroll; no console errors. Known-good control: the ? and ⚙ buttons next to it. Observer: agent in the browser pane.
7. [human] On the owner's phone (installed app): Turn on → allow → **Send a test** → a "CLC Staff" test notification arrives within a minute. Known-good control: a Google Voice notification on the same phone. Observer: owner.
8. [human] Owner texts the business number and emails info@ from a phone/address on a test customer → within 10 minutes: a notification "Text from <test customer>" (and one for the email), tapping it opens that customer's account; 💬 shows the count on the computer too. Known-good control: the same messages in that customer's Text & call history. Observer: owner.
9. [human] Turn off on that phone → the next test text gives no notification there (the 💬 count still goes up). Observer: owner.

## Contract

**`staffPrefs/{lowercase staff email}`** (each staff member writes only their own; server reads all, and deletes gone devices):

| Field | Value |
|---|---|
| `messagesSeenAt` | server time when they last opened 💬 New messages |
| `pushDevices` | map `{ <FID>: { name: "iPhone" \| "Android phone" \| "Chrome on Windows"…, at: ms } }`, ≤ 10 |
| `updatedAt`, `updatedBy` | stamp, like every staff write |

**FCM message** (HTTP v1 `POST https://fcm.googleapis.com/v1/projects/clc-leads-site/messages:send`), data-only:

```json
{ "message": { "fid": "<FID>",
  "data": { "title": "Text from Sample Customer", "body": "Thursday works…", "link": "#accounts/customer/sample-customer", "tag": "customer:sample-customer" },
  "webpush": { "headers": { "Urgency": "high", "TTL": "86400" } } } }
```

The service worker reads `event.data.json().data`, shows `title`/`body` (icon `/leads/icons/icon-192.png`, `tag` replaces an older notification from the same person) and opens `/leads/` + `link` on tap (focusing an open app window if there is one).

**Callable `sendTestPush`** (us-south1): staff only (same test as `isStaff()` in the rules); sends a test notification to the caller's own devices; answers `{ devices, sent, gone }`.

**Links in the app**: `#messages` opens the New messages list over the current tab.

## Links

- Message sync (what gets filed, `syncedAt`, `direction`): `docs/specs/message-sync.md`
- Staff app layout and tabs: `docs/specs/customers.md`
- Sources checked 2026-10-09: Firebase "Receive messages in a web app / Set up a JavaScript client" (FID `register`/`onRegistered`; `getToken` deprecated; FCM Registration API enabled by default in new projects), `@firebase/messaging` 13.0.0 types and source (`register` asks permission when still "default", accepts our own `serviceWorkerRegistration`), firebase-admin release notes (FID sending added in 14.1.0; 14.0.0 breaking changes), FCM v1 `messages.send`.
