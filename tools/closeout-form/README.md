# Store Operations Web App

A small, free web app for Cross Creek Pak N Ship, built on **Google Apps
Script**. One deployment serves three pages staff open on a phone/tablet:

| Page | URL | What it does |
|---|---|---|
| **Close-out** | `…/exec` | End-of-day money, postage, packages, employees |
| **Opening** | `…/exec?page=open` | Morning bank count + opening checklist |
| **Appointments** | `…/exec?page=appt` | Log notary / passport appointments |

## What the close-out does on Submit
1. **Over/short** — computes expected drawer (starting bank + cash − petty cash)
   vs. counted, and flags when the till is off by more than the tolerance.
2. **Writes a summary row** to the **Closeouts** sheet.
3. **Logs each employee** (name, clock in/out, customers helped, notary &
   passport mentions) to **Employees**.
4. **Auto-reads the category-code report photo** (Gemini Vision): fills Postage
   used + Prepaid, and saves every report line to **Report Lines**.
5. **Files the report photo** into a Drive folder.
6. **Emails the summary**, and sends a **low-postage alert** when the CRM
   balance is below the threshold.
7. **Estimates your CPU pay** for the day (see below).

## Profit / CPU pay
Per your USPS contract (Attachment 4), the app estimates daily compensation:
- **19.5%** of weigh-in mail + special services (Mailing Services + Special
  Services on the report — affixed postage is excluded), plus
- **$0.25 per prepaid piece**.

The commissionable mail figure auto-fills from the report photo (verify it).
Daily **Est. CPU pay** is stored in the Closeouts sheet and rolled up on the
Dashboard and in the weekly/monthly summary emails. Rates live in
`CONFIG.COMMISSION_RATE` and `CONFIG.PREPAID_RATE` — edit them if USPS adjusts
your contract. *(8% stamp/product compensation is not included; add it later if
you want.)*

Built-in safeguards: **PIN gate**, **draft auto-save** (survives a refresh /
dropped connection), **photo compression + retake**, a **review screen with
sanity-check warnings**, and a **duplicate-day warning**.

> Cash, card totals, money in register, and postage left in CRM aren't on the
> report photo — those always come from the register/CRM and stay manual.

## Sheet tabs created automatically
`Closeouts` · `Employees` · `Report Lines` · `Openings` · `Appointments`
(plus `Dashboard` when you run `buildDashboard`).

## Files
| File | Paste into Apps Script as |
|---|---|
| `Code.gs` | the script file |
| `index.html` | HTML file named **`index`** (close-out) |
| `opening.html` | HTML file named **`opening`** |
| `appointments.html` | HTML file named **`appointments`** |

---

## One-time setup (~15 minutes)

### Step 1 — Create the Google Sheet
1. <https://sheets.google.com> → **Blank**. Name it e.g. *"Cross Creek Ops"*.
2. Copy its **ID** from the URL: `…/spreadsheets/d/`**`THIS_IS_THE_ID`**`/edit`
   (tabs/headers are created automatically).

### Step 2 — Create the Drive folder for photos
1. <https://drive.google.com> → **New → Folder** (e.g. *"Report Photos"*).
2. Open it and copy the **ID**: `…/folders/`**`THIS_IS_THE_ID`**

### Step 3 — Create the Apps Script project
1. <https://script.google.com> → **New project**.
2. Replace the sample `Code.gs` with this folder's **`Code.gs`**.
3. Fill in `CONFIG` at the top:
   - `SHEET_ID`, `FOLDER_ID` → from Steps 1–2
   - `EMAIL_TO`, `SEND_EMAIL` → daily summary settings
   - `GEMINI_API_KEY` → see Step 3a (leave placeholder to disable auto-read)
   - `STAFF_PIN` → the shared PIN staff type to open the app (set `''` for none)
   - `OVER_SHORT_TOLERANCE` → dollars before a till variance is flagged
   - `POSTAGE_ALERT_THRESHOLD` → CRM balance that triggers the low-postage email
   - `COMMISSION_RATE` (0.195) / `PREPAID_RATE` (0.25) → CPU pay rates
4. Add the three HTML files: **+** next to *Files* → **HTML** → name it exactly
   `index`, then again for `opening`, then `appointments` — pasting each
   file's contents.
5. **Save**.

### Step 3a — Free Gemini API key (photo auto-read)
1. <https://aistudio.google.com/apikey> → **Create API key**, copy it.
2. Paste into `CONFIG.GEMINI_API_KEY`, **Save**. One photo/day is well inside
   the free tier.

### Step 4 — Deploy as a Web App
1. **Deploy → New deployment** → gear → **Web app**.
2. **Execute as:** *Me*. **Who has access:** *Anyone* (or *Anyone within your
   Workspace* if all staff use store Google accounts — a second access layer on
   top of the PIN).
3. **Deploy**, approve the permissions prompt (Sheets, Drive, Gmail, external
   fetch for Gemini).
4. Copy the **Web app URL**.

### Step 5 — Put it on the register device
- Open the URL, **Add to Home Screen** for a one-tap icon.
- The page nav links switch between Close-out / Opening / Appointments.

### Step 6 (optional) — Build the dashboard
In the Apps Script editor, choose **`buildDashboard`** in the function dropdown
and click **Run** once. It creates a **Dashboard** tab with current-month KPIs,
per-employee upsell totals, and category-mix breakdowns (live formulas).

### Step 7 (optional) — Scheduled summary emails
In the editor → **Triggers** (clock icon) → **Add trigger**:
- Function `sendWeeklySummary`, time-driven, weekly.
- Function `sendMonthlySummary`, time-driven, monthly.
These email totals + net over/short for the period to `EMAIL_TO`.

---

## Daily use
- **Morning:** open **Opening**, count the bank, tick the checklist, submit.
  (The close-out auto-prefills the starting bank from this.)
- **During the day:** log any notary/passport booking on **Appointments**.
- **Close:** after counting the drawer and running the USPS CPU end-of-day, open
  **Close-out**, photograph the category-code report (auto-fills postage +
  prepaid — verify), enter cash/card/register/voided, add each employee, review
  the warnings, and submit.

## Updating later
Paste new versions into the Apps Script project, then **Deploy → Manage
deployments → Edit → Version: New version → Deploy**. Same URL keeps working.

## Troubleshooting
- **"Not running inside Apps Script"** → you opened the raw HTML; saving only
  works through the deployed Web app URL.
- **Auto-read fails** → check the Gemini key; staff can always type the numbers.
- **Permission errors** → re-run Step 4 and approve the Google prompt.
- **Over/short looks wrong** → confirm staff entered *total cash counted in the
  drawer before pulling the deposit*, and the correct starting bank.
