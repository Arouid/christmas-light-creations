# Phone-number sign-in for the customer account

Owner's ask (2026-10-13, "do 5"): customers sign in to `/account/` with their phone number, not only an email. TODO #67. Built 2026-10-14.

## The problem

Fifteen years of records hold many customers with a phone number and no email: they can't sign in at all today. Everyone else has to remember *which* email their proposal went to before the emailed link works. A phone number is the one thing every customer has given us, and it's what they text us from.

## What we want

A third way in on the sign-in screen, in plain words: **Sign in with your phone number** → type the number → get a 6-digit code by text → type the code → the account opens. Same account page, same data, nothing new to learn. Staff tell customers "sign in with the phone number we have for you".

## What we don't do

- **No password**, as before.
- **No code of our own.** Firebase Authentication's phone provider sends the text and checks the code (Google's SMS, Google's abuse limits). We never see or store the code and never send SMS from our own code.
- **Never staff access.** A phone sign-in has no verified Google email, so `isStaff()` in `firestore.rules` and `isStaffToken` on the server both refuse it, like the email link does. Staff access stays "Google sign-in + on the `staff` list" only.
- **No new collection.** Lookup keys are two more fields on records that exist (`phoneKeys`), and sign-ins go in the same `customerLogins` collection.
- **No other countries.** The input takes a US number (10 digits, with or without the 1); the SMS region policy in the console should allow the US only.

## How it works

| Piece | File | Notes |
|---|---|---|
| Phone keys | `functions/phone.js` (pure) | `phoneKey("(281) 555-0101") → "+12815550101"`, the E.164 form Firebase puts in `token.phone_number`. `phonesIn(field)` finds every number in a free-text field (records hold "281… / 832…"). `prettyPhone` for the screen |
| `phoneKeys` on records | `functions/account.js` → `proposalPhoneKeys`, `customerPhoneKeys`; written by `functions/index.js` | Proposals and invoices: `customer.phone`. Customers: `phone` + `otherPhones` (linked from old records). Kept exactly like `emailKeys`: the `proposalKeys` / `customerKeys` triggers rewrite them whenever a record is saved (only if they changed, so no loop), `invoiceSteps` on every invoice write, and the one-off fill below. The browser never writes them |
| Who is signed in | `functions/account.js` → `accountIdentity(token)` | `{ email, phone, key }`: the verified email (Google or email link) and/or the phone (`phone_number`, E.164). `key` = email, else phone: the string used for `updatedBy: customer:<key>`, chat `by`, `reportedBy`, the login record |
| Lookup | `functions/index.js` → `proposalTokensFor`, `invoicesFor`, `customersFor` | Take the identity; one `array-contains` query per key the token has (`emailKeys` for the email, `phoneKeys` for the phone), results merged. The five account callables (`myAccount`, `reportProblem`, `updateMyDetails`, `sendAccountMessage`, `rebookMe`) all go through it |
| Fill of old records | `ensureAccountIndex` (`functions/index.js`), `serverState/emailIndex` version 2 | The first account lookup after the deploy reads every proposal, customer and invoice once and writes the keys that differ (batches of 400), then stamps the version. **Lazy fill, not a script**: that's how `emailKeys` was filled (version 1), nobody has to run anything, and it can't be forgotten. Triggers fire on those writes but find the keys equal and write nothing |
| Sign-in screen | `src/account/AccountPage.jsx`, pure parts in `src/account/phoneSignIn.js` | Third button under Google; number step, code step (`inputMode="numeric"`, `autocomplete="one-time-code"` so phones offer the code from the text); Send again / Use a different number; plain error words per Firebase code |
| Firebase calls | `src/lib/account.js` → `sendPhoneCode`, `confirmPhoneCode` | `new RecaptchaVerifier(auth, container, { size: 'invisible' })` then `signInWithPhoneNumber(auth, e164, verifier)`; the code goes to `confirmationResult.confirm(code)`. The verifier is cleared after use and on every error, so Send again gets a fresh one |
| Login record | `customerLogins/{key}` (`recordLogin`) | Key = email for email/Google sign-ins (as before), the E.164 phone for phone sign-ins; fields add `phone`, `provider` "phone". Staff's login line (`src/lib/customerLogins.js` → `getLatestLogin(keys)`) reads every key of the record (all its emails and phones) and shows the newest |
| Rules | `firestore.rules` | No new access: the account page reads nothing from Firestore directly (everything comes through callables, security review risk 2), and staff reads of `customerLogins/{key}` already allow any id. `phoneKeys` joins `invoiceServerKeys()` so a browser can't write it on an invoice (consistency with `emailKeys`; nothing breaks before the republish) |

### reCAPTCHA and App Check

Firebase phone auth on the web **requires an `ApplicationVerifier`** (Firebase docs, phone-auth, checked 2026-10-14: `signInWithPhoneNumber(auth, phoneNumber, appVerifier)`; the docs say "you don't need to set up a reCAPTCHA client manually", the SDK does it). We use the **invisible** verifier anchored to an empty `div` in the form: no checkbox, no picture puzzle unless Google suspects a robot. Its badge is hidden by the same CSS as the App Check badge, and the page already shows `RecaptchaNote` (the text Google asks for when the badge is hidden).

App Check stays as it is (reCAPTCHA Enterprise, `src/lib/firebase.js`). The Auth SDK's loader is written for this case: when App Check loaded the Enterprise script first, `window.grecaptcha` exists without `render()` and the SDK loads the classic script beside it (`ReCaptchaLoaderImpl`, "Another load will add it"). No Identity Platform upgrade, no `initializeRecaptchaConfig`.

## Edge cases

| Case | What happens |
|---|---|
| The number is on two customer records | Both are found (like an email on two records today): the page shows the first record's chat, details and price, service calls check all, invoices and proposals from all |
| A number with no record | Firebase still signs them in (it can't know); `myAccount` finds nothing and the page says "Nothing under this phone number yet: call or text us". Nothing is created |
| The record holds the number with a different format | `phonesIn` normalises "(281) 555-0101", "281.555.0101", "+1 281 555 0101", "12815550101" to one key |
| Two numbers in one field ("281… / 832…") | Both become keys |
| A landline | The text never comes. The screen says "a mobile number that gets texts"; "Didn't get a code?" offers Send again, the email link and the phone number to call. Help has "The code never came" |
| Wrong code | "That code isn't right": they can retype (Firebase limits attempts); after `auth/code-expired`, Send again |
| Too many texts to one number / from one address | Firebase's `auth/too-many-requests`: "Too many tries. Wait a while, or sign in with the email link" |
| Phone provider not switched on yet | `auth/operation-not-allowed` → "Phone sign-in isn't switched on yet. Use Google or the email link" (so the button can ship before the owner flips the switch) |
| iPhone home-screen app | The emailed link opens in Safari, not the app (customer-app spec); Google and the phone code both work inside the app. The note under the buttons now says so |
| Localhost | Firebase's docs: "localhost is not allowed as a hosted domain for the purposes of phone auth". Real codes are checked on the live site with the console's **test numbers** (no SMS sent, fixed code); `/account/?demo=signin` shows the screens with nothing sent |
| A customer with both a Google account and a phone on file | They can use either; each signs into a different Firebase user, but both land on the same records, since lookup is by keys, not by user id |
| Someone types a number that isn't theirs | They can't read the text, so they can't get in. Same strength as the emailed link |

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-10-14 | Firebase phone auth, invisible reCAPTCHA, no code of our own | Google sends and checks the codes, rate-limits abuse, needs no secrets and no SMS provider. Writing our own would mean an SMS vendor, a code store and our own limits |
| 2026-10-14 | `phoneKeys` kept by the same triggers as `emailKeys`, filled lazily on the first lookup (index version 2) | One mechanism, already proven; nothing for the owner to run |
| 2026-10-14 | Lookup by **keys, not by Firebase user id** | A customer may sign in by Google one day and by phone the next; records are matched by what's on them |
| 2026-10-14 | Login record keyed by the phone for phone sign-ins; the staff line reads all of a record's keys | Keeps the "written only by the server, staff read" rule and needs no rules change |
| 2026-10-14 | US numbers only | The business serves Pearland; the SMS region policy should allow only the US, which also caps SMS cost |
| 2026-10-14 | No lookup before sending the code | The emailed link only goes to emails on a record (so nobody can probe addresses). For phones, Firebase sends the text before we're asked anything; a lookup first would need a public "is this number a customer?" endpoint, which is the probe we avoid. A stranger spends one SMS and sees an empty account |

## Acceptance criteria

1. **Owner, on his phone, live site**: Sign in → *Sign in with your phone number* → his number → *Text me a code* → a 6-digit text arrives within a minute → the code → his account opens with the same proposals, invoices and schedule as by email.
2. **Owner, a test number from the console** (no SMS): the same flow with the fixed code signs in; `customerLogins/+1…` appears in Firestore with `provider: "phone"`.
3. **Staff app** → Accounts → that customer: the login line reads "last signed in … (phone)".
4. **A phone with no record**: the page says nothing is under that number and shows the call button; Firestore gets no new customer, proposal or invoice.
5. **Rules**: a token with only `phone_number` can't read any staff collection or write `customerLogins` (emulator test).
6. **Demo**: `/account/?demo=signin` at 375 px shows three buttons, the number step, the code step and signs into the sample account with any 6 digits, with nothing sent and no console errors.

## Contract

- `accountIdentity(token)` → `{ email, phone, key } | null`. `email` only when `email_verified === true`; `phone` only when `phone_number` is a string starting with `+`. `key` = email || phone.
- Records: `phoneKeys: string[]` (E.164, unique, order of appearance) on `proposals`, `customers`, `invoices`; server-written.
- `customerLogins/{key}`: `{ email, phone, firstAt, lastAt, provider, app? }`; `provider` ∈ Google, email link, phone.
- `myAccount` answer adds `phone` (E.164 or '') beside `email` ('' for phone sign-ins).

## Owner steps (once)

1. Firebase console → **Authentication → Sign-in method → Add new provider → Phone → Enable** (project clc-leads-site).
2. Same tab → **Phone numbers for testing** → add a fictional number (`+1 281 555 0199`, say) with a 6-digit code: signs in with no SMS, for checking the flow.
3. **Authentication → Settings → SMS region policy** → *Allow* → United States only.
4. Deploy the functions (the TODO row has the command). No rules republish is needed for sign-in to work; republish when convenient (`phoneKeys` in the invoice server-only list).

## Cost

Phone sign-in is **billed per SMS on the Blaze plan** (which this project is on for Cloud Functions). Firebase's pricing page (checked 2026-10-14) says "Billed per SMS sent, see current rates" and points at Google's Identity Platform SMS table; that table isn't readable from here, so the figures below are from two 2026 write-ups of it and the owner should glance at it once: **US and Canada about $0.01 per SMS**, the **first 10 SMS a day free**, **3,000 SMS a day cap** without Identity Platform. The old "10,000 free verifications a month" tier ended in September 2024 (SMS needs a billing account since then), so the TODO's "free to 10k/month" no longer holds. For this business: a few hundred sign-ins a season ≈ a few dollars a year; a text goes out every time the button is tapped, whether or not the code is typed. The region policy (US only) keeps a bot from running up foreign SMS. Test numbers in the console send nothing.

Links: Firebase docs [phone auth for the web](https://firebase.google.com/docs/auth/web/phone-auth), [auth limits](https://firebase.google.com/docs/auth/limits) (SMS 3,000/day, 150 verification requests per IP per hour), [pricing](https://firebase.google.com/pricing) → [Identity Platform SMS rates](https://cloud.google.com/identity-platform/pricing); `docs/specs/customer-app.md` (the installed app), `docs/security-review.md` (why lookups use keys).
