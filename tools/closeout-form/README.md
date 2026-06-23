# End-of-Day Close-Out Form

A digital end-of-day form for Cross Creek Pak N Ship. The closer fills it out on
a phone/tablet at close; on Submit it:

1. **Writes the numbers to a Google Sheet** (one summary row per day).
2. **Saves the category-code report photo into a preset Google Drive folder**
   and stores the photo's link in the sheet.
3. **Logs each employee** (name, clock in/out, customers helped, notary &
   passport mentions) to a second tab.
4. **Auto-reads the category-code report photo** with Gemini Vision: the moment
   the photo is attached, it fills in **Postage used** and **Prepaid packages**,
   and on submit it saves every line of the report (code, description, qty,
   value) to a **"Report Lines"** tab. *(Staff verify before submitting — OCR on
   a curled receipt isn't perfect. Optional: works without a key, just manual.)*
5. *(Optional)* **emails** the summary + photo link to the store inbox.

> Cash, credit-card totals, money left in register, and postage left in CRM are
> **not** on the report photo — those always come from the register/CRM and stay
> manual entries.

It runs entirely on **Google Apps Script** — free, no Formspree, no monthly
cost, and no separate web hosting.

## Files

| File | What it is |
|---|---|
| `index.html` | The form (UI). Paste into the Apps Script project as an HTML file named `index`. |
| `Code.gs` | The backend. Paste into the Apps Script project's script file. |

---

## One-time setup (~10 minutes)

### Step 1 — Create the Google Sheet
1. Go to <https://sheets.google.com> → **Blank** spreadsheet.
2. Name it e.g. *"Cross Creek Close-Outs"*.
3. Copy its **ID** from the URL — the long part between `/d/` and `/edit`:
   `docs.google.com/spreadsheets/d/`**`THIS_IS_THE_ID`**`/edit`
   *(You don't need to add tabs/headers — the script creates "Closeouts" and
   "Employees" automatically.)*

### Step 2 — Create the Drive folder for photos
1. Go to <https://drive.google.com> → **New → Folder**, name it e.g.
   *"Close-Out Report Photos"*.
2. Open the folder and copy its **ID** from the URL:
   `drive.google.com/drive/folders/`**`THIS_IS_THE_ID`**

### Step 3 — Create the Apps Script project
1. Go to <https://script.google.com> → **New project**.
2. Delete the sample code in `Code.gs`, then **paste the contents of this
   folder's `Code.gs`**.
3. At the top, fill in `CONFIG`:
   - `SHEET_ID` → the ID from Step 1
   - `FOLDER_ID` → the ID from Step 2
   - `EMAIL_TO` → where to send the summary (default is the store email)
   - `SEND_EMAIL` → leave `true` to get emails, or set `false` to turn off
   - `GEMINI_API_KEY` → for auto-reading the report photo (see Step 3a). Leave
     the placeholder to disable auto-read; staff then type postage/prepaid.
   - `GEMINI_MODEL` → leave as is unless you want a different Gemini model.
4. Add the form file: click **+** next to *Files* → **HTML** → name it exactly
   **`index`** → delete the sample and **paste the contents of `index.html`**.
5. **Save** (💾).

### Step 3a — Get a free Gemini API key (for photo auto-read)
*Skip this if you don't want auto-read; the form still works, staff just type
postage + prepaid by hand.*
1. Go to <https://aistudio.google.com/apikey> and sign in.
2. Click **Create API key** and copy it.
3. Paste it into `CONFIG.GEMINI_API_KEY` in `Code.gs`, then **Save**.
   - One photo a day is well within the free tier.
   - When a photo is attached, the form reads it and fills Postage used +
     Prepaid; the full line-by-line breakdown lands in the "Report Lines" tab on
     submit.

### Step 4 — Deploy as a Web App
1. Click **Deploy → New deployment**.
2. Gear icon → **Web app**.
3. Set:
   - **Execute as:** *Me* (your Google account)
   - **Who has access:** *Anyone* (so staff can open it without signing in) — or
     *Anyone within [your Workspace]* if all staff use store Google accounts.
4. **Deploy**. Approve the permissions prompt (it needs Sheets, Drive, and Gmail
   to do its job).
5. Copy the **Web app URL**. That's the link staff open each night.

### Step 5 — Put it on the register device
- Open the Web app URL on the register phone/tablet.
- **Add to Home Screen** (iOS Safari: Share → Add to Home Screen; Android
  Chrome: ⋮ → Add to Home screen) so it's a one-tap "Close-Out" icon.

---

## Daily use
At close, after counting the drawer and running the USPS CPU end-of-day:
1. Open the **Close-Out** icon.
2. **Take a photo of the category-code report** — it auto-fills Postage used +
   Prepaid (verify them), then fill in cash, card, register, postage left, and
   voided.
3. Add a block for **each employee** who worked (name, clock in/out, customers
   helped, # told about notary, # told about passport).
4. **Submit.** Done — data is in the sheet, photo is in the Drive folder.

## Updating the form later
If you change `index.html` or `Code.gs`, paste the new version into the Apps
Script project and **Deploy → Manage deployments → Edit → Version: New version →
Deploy**. The same URL keeps working.

## Notes & troubleshooting
- **"Not running inside Apps Script"** message → you opened the raw HTML file
  directly. Saving only works through the deployed Web app URL (Step 4).
- **Permission errors** → re-run Step 4 and approve the Google prompt.
- The photo is named `YYYY-MM-DD_category-report_[closer].jpg` in the Drive
  folder, so files sort by date automatically.
- Want photos emailed as an *attachment* instead of a link? That's a small
  tweak to `sendSummaryEmail` — ask and it can be added.
