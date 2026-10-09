/**
 * Christmas Light Creations: message sync (runs inside info@'s Google account).
 *
 * Every 5 minutes, collects new mail in info@ (Google Voice text/voicemail
 * notifications forwarded from clc.voicemail.01, customer emails in, our
 * emails out) and sends it to the `messageSync` Cloud Function, which files
 * it in each customer's history in the staff app. All matching and parsing
 * happens there; mail from anyone who isn't a customer/lead is not kept
 * (except texts/voicemails from unknown numbers, shown as "Unmatched").
 * Spec: docs/specs/message-sync.md in the website repo.
 *
 * SETUP (once, signed in as info@christmas-light-creations.com):
 *  1. script.google.com -> New project -> name it "CLC message sync".
 *     Delete the sample code, paste this whole file, Save.
 *  2. Project Settings (gear) -> Script Properties -> Add:
 *       SYNC_URL = https://messagesync-77t3pogapq-vp.a.run.app
 *       SYNC_KEY = the same key you gave `firebase functions:secrets:set MESSAGE_SYNC_KEY`
 *  3. Editor -> choose function `testSync` -> Run. Allow the permissions
 *     (read Gmail, connect to an external service). The log lists the last
 *     Voice emails as text/voicemail with the last 4 digits. Nothing is saved.
 *  4. Choose `setup` -> Run. This adds the 5-minute trigger (Triggers page
 *     shows "syncMessages - Time-based"). First run looks back 1 day.
 *  To stop: Triggers (clock icon) -> delete the trigger.
 */

const LOOKBACK_MS = 24 * 3600 * 1000 // first run
const OVERLAP_MS = 15 * 60 * 1000 // re-send the last 15 minutes each run (duplicates are ignored)
const BATCH = 25
const MAX_BODY = 20000
const VOICE_QUERY = 'from:(txt.voice.google.com OR voice-noreply@google.com)'

function setup() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'syncMessages')
    .forEach((t) => ScriptApp.deleteTrigger(t))
  ScriptApp.newTrigger('syncMessages').timeBased().everyMinutes(5).create()
  Logger.log('Trigger added: syncMessages every 5 minutes')
}

// The timed job. If the server can't be reached the cursor stays put and the
// next run sends the whole window again.
function syncMessages() {
  const lock = LockService.getScriptLock()
  if (!lock.tryLock(5000)) return
  try {
    const props = PropertiesService.getScriptProperties()
    const started = Date.now()
    const since = Number(props.getProperty('SYNC_CURSOR')) || started - LOOKBACK_MS
    const from = since - OVERLAP_MS
    const items = collect_(`after:${Math.floor(from / 1000)} -in:spam -in:trash -in:drafts`, from)
    const totals = { saved: 0, duplicate: 0, skipped: 0, unmatched: 0, dropped: 0 }
    for (let i = 0; i < items.length; i += BATCH) {
      const r = post_({ items: items.slice(i, i + BATCH) })
      Object.keys(totals).forEach((k) => { totals[k] += r[k] || 0 })
    }
    props.setProperty('SYNC_CURSOR', String(started))
    Logger.log(`${items.length} emails: ${JSON.stringify(totals)}`)
  } finally {
    lock.releaseLock()
  }
}

// Dry run on the 10 newest Voice emails: shows how they parse, saves nothing.
function testSync() {
  const items = collect_(`${VOICE_QUERY} newer_than:30d`, 0).slice(-10)
  if (!items.length) { Logger.log('No Google Voice emails in info@ in the last 30 days. Check the Voice settings and the Gmail filter in clc.voicemail.01.'); return }
  const r = post_({ dryRun: true, items })
  r.results.forEach((x) => Logger.log(JSON.stringify(x)))
}

function collect_(query, fromMs) {
  const items = []
  for (let start = 0; start < 500; start += 100) {
    const threads = GmailApp.search(query, start, 100)
    threads.forEach((t) => t.getMessages().forEach((m) => {
      if (m.isDraft() || m.getDate().getTime() < fromMs) return
      items.push({
        gmailId: m.getId(),
        messageId: m.getHeader('Message-ID'),
        date: m.getDate().toISOString(),
        from: m.getFrom(), to: m.getTo(), cc: m.getCc(), bcc: m.getBcc(),
        subject: m.getSubject(),
        body: m.getPlainBody().slice(0, MAX_BODY),
      })
    }))
    if (threads.length < 100) break
  }
  return items.sort((a, b) => (a.date < b.date ? -1 : 1))
}

function post_(payload) {
  const props = PropertiesService.getScriptProperties()
  const url = props.getProperty('SYNC_URL')
  const key = props.getProperty('SYNC_KEY')
  if (!url || !key) throw new Error('Set SYNC_URL and SYNC_KEY in Project Settings -> Script Properties')
  const res = UrlFetchApp.fetch(url, {
    method: 'post', contentType: 'application/json', payload: JSON.stringify(payload),
    headers: { 'x-clc-sync-key': key }, muteHttpExceptions: true,
  })
  const code = res.getResponseCode()
  if (code !== 200) throw new Error(`messageSync answered ${code}${code === 401 ? ' (SYNC_KEY does not match the Firebase secret)' : ''}`)
  return JSON.parse(res.getContentText())
}
