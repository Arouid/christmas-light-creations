"""Rebuild estimate requests from the old site's WP Mail SMTP email log.

Usage (from the repo root):
  python -I scripts/old-site/past_requests_from_emails.py old-site-backup/i704895_wp1.sql.gz
    old-site-backup/past-estimate-requests-likely-real.csv old-site-backup/past-requests-all.csv
Writes the likely-real rows plus one row per notification/calculator email,
in the same columns, so the staff app's importer can clean and merge them
(src/lib/oldEstimates.js). Output holds customer data: keep it in the
gitignored old-site-backup/ folder.
"""
import csv
import html
import json
import re
import sys

import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sqlrows import rows  # noqa: E402

dump, base_csv, out = sys.argv[1:4]
COLS = ['Date', 'Source', 'Form', 'First name', 'Last name', 'Email', 'Phone', 'Address', 'City', 'Message', 'All fields']
LABELS = ['Name', 'Phone', 'Email', 'Address', 'Message', 'How should we contact you?', 'How can we help you?']


def text(h):
    t = re.sub(r'<(style|script)[^>]*>.*?</\1>', ' ', h, flags=re.S | re.I)
    t = re.sub(r'<br\s*/?>|</(p|tr|div|h\d|td)>', '\n', t, flags=re.I)
    t = html.unescape(re.sub('<[^>]+>', ' ', t))
    return [ln.strip() for ln in re.sub(r'[ \t\xa0]+', ' ', t).split('\n') if ln.strip()]


def fields(lines):
    out, cur = {}, None
    for ln in lines:
        if ln in LABELS:
            cur = ln
            out[cur] = []
        elif ln in ('Map It', 'United States') or ln.startswith('Next Steps'):
            continue
        elif cur:
            out[cur].append(ln)
    return {k: ' '.join(v).strip() for k, v in out.items()}


result = []
with open(base_csv, encoding='utf-8-sig', newline='') as f:
    result.extend(csv.DictReader(f))

added = 0
for r in rows(dump, 'wp_wpmailsmtp_emails_log'):
    subject, people, body, date = r[2].strip(), r[3], r[7] or '', r[9].strip()
    if subject.startswith('New submission from Submit Estimate') or subject.startswith('New estimate from Get An Estimate'):
        f = fields(text(body))
        msg = f.get('Message') or f.get('How can we help you?', '')
        contact = f.get('How should we contact you?', '')
        parts = [f'Name: {f.get("Name", "")}', f'Phone: {f.get("Phone", "")}', f'Email: {f.get("Email", "")}', f'Message: {msg}']
        parts += [f'How should we contact you? {k}: {k}' for k in ('Email', 'Text', 'Phone') if k in contact]
        if f.get('Address'):
            parts.append(f'address: {f["Address"]}')
        if r[8].strip() == '0':
            parts.append('Notification: failed')
        row = {'Date': date, 'Source': 'Email log', 'Form': subject.split(' from ')[-1], 'First name': '', 'Last name': '',
               'Email': f.get('Email', ''), 'Phone': f.get('Phone', ''), 'Address': f.get('Address', ''), 'City': '',
               'Message': msg, 'All fields': ' | '.join(parts)}
    elif subject.startswith('Estimate Submission'):
        try:
            to = (json.loads(people).get('to') or [''])[0]
        except ValueError:
            continue
        ref = re.search(r'Ref:\s*(\S+)', ' '.join(text(body)))
        row = {'Date': date, 'Source': 'Calculator email', 'Form': 'Estimate calculator', 'First name': '', 'Last name': '',
               'Email': to, 'Phone': '', 'Address': '', 'City': '', 'Message': '',
               'All fields': f'Email: {to} | Message: Used the online price calculator{f" (ref {ref.group(1)})" if ref else ""}'}
    else:
        continue
    result.append(row)
    added += 1

# Price-calculator log (encrypted; decrypt_calculator.mjs reads this file).
cols, grab = [], False
import gzip  # noqa: E402
with gzip.open(dump, 'rt', encoding='utf-8', errors='replace') as f:
    for line in f:
        if line.startswith('CREATE TABLE `wp_lfb_logs`'):
            grab = True
            continue
        if grab:
            if line.startswith(')'):
                break
            m = re.match(r'\s+`(\w+)`', line)
            if m:
                cols.append(m.group(1))
keep = ['ref', 'email', 'dateLog', 'phone', 'address', 'formTitle', 'contentTxt']
key = next((v[2] for v in rows(dump, 'wp_options') if v[1].strip() == 'lfbK'), '')
logs = [{k: (v or '').strip() for k, v in zip(cols, r) if k in keep} for r in rows(dump, 'wp_lfb_logs')]
with open(os.path.join(os.path.dirname(out), 'calculator-logs.json'), 'w', encoding='utf-8') as f:
    json.dump({'key': key.strip(), 'logs': logs}, f)

with open(out, 'w', encoding='utf-8', newline='') as f:
    w = csv.DictWriter(f, fieldnames=COLS)
    w.writeheader()
    w.writerows({k: r.get(k, '') for k in COLS} for r in result)
print(f'{len(result)} rows ({added} from the email log)')
