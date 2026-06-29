# Auto-save signed agreements to your Google Drive

`offer.html` can send every **signed** agreement straight to your Google
Drive. Because a public web page isn't allowed to write to your Drive on its
own, a tiny **Google Apps Script** acts as the bridge — it runs under your
Google account and saves each submission into a Drive folder.

This is a **one-time, ~5-minute setup**. No server or hosting bill.

---

## What you get

When a customer picks a package, checks **"I agree"**, signs, and clicks
**Confirm & Submit**, a copy of the signed agreement (including their drawn
signature) is saved to:

> **My Drive › Signed Agreements - Printing & Signs Depot**

Each submission is saved as an `.html` file (and a `.pdf` copy when it can be
generated), named like:

> `Signed Agreement - Jane Smith - 2026-06-29_14-30.html`

---

## Step 1 — Create the Apps Script

1. Go to **https://script.google.com** and click **New project**.
2. Delete the sample code in `Code.gs`.
3. Open `signed-agreement-upload.gs` from this repo, copy **all** of it, and
   paste it into the editor.
4. Click the **Save** icon (name the project anything, e.g. *PSD Agreements*).

## Step 2 — Deploy it as a Web App

1. Click **Deploy › New deployment**.
2. Click the gear ⚙ next to "Select type" and choose **Web app**.
3. Set:
   - **Description:** anything (e.g. `Signed agreement uploader`)
   - **Execute as:** **Me (your@gmail.com)**
   - **Who has access:** **Anyone**
     *(required so the public offer page can post to it; the script only
     ever writes to your Drive)*
4. Click **Deploy**.
5. Click **Authorize access** and approve the permissions (it asks to manage
   files it creates in your Drive). If Google shows an "unverified app"
   warning, click **Advanced › Go to … (unsafe)** — this is your own script.
6. Copy the **Web app URL**. It looks like:
   `https://script.google.com/macros/s/AKfycb..../exec`

## Step 3 — Paste the URL into the offer page

1. Open `offer.html`.
2. Near the top of the `<script>` block, find:
   ```js
   var UPLOAD_URL = '';
   ```
3. Paste your Web app URL between the quotes:
   ```js
   var UPLOAD_URL = 'https://script.google.com/macros/s/AKfycb..../exec';
   ```
4. Save. Done — signed agreements now upload automatically.

---

## Test it

1. Open `offer.html` in a browser.
2. Pick a package, check **I agree**, type a name, sign, click **Confirm &
   Submit**.
3. Check your Drive for the **Signed Agreements - Printing & Signs Depot**
   folder — your test submission should be there within a few seconds.

## Notes & troubleshooting

- **Nothing showed up?** Re-open the Web app URL in a browser; you should see
  `{"ok":true,...}`. If not, re-check Step 2 (Execute as *Me*, access
  *Anyone*).
- **Changed the script later?** You must **Deploy › Manage deployments › Edit
  › New version** for changes to take effect (the `/exec` URL stays the same).
- **Leave `UPLOAD_URL` blank** and the page simply shows an on-screen
  confirmation and the **Print / Save PDF** option instead of uploading.
- The page never exposes any Google credentials — it only knows the public
  `/exec` URL, and the script can only write files in *your* Drive.
- Want submissions emailed to you too, or logged to a Google Sheet? That's a
  small addition to the script — just ask.
