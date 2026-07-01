# Field Agreements — iPad app (Phase 1)

An offline-first web app for running a handyman job on an iPad: enter the
customer once, pick the agreements, photograph pre-existing conditions, have the
customer sign on-screen, and generate a single signed PDF packet.

> ⚠️ The agreement text is a **template, not legal advice** — see
> [`../liability-agreements/README.md`](../liability-agreements/README.md).

## What works now (Phase 1)
- ✅ Runs fully offline (installable PWA — "Add to Home Screen")
- ✅ Company settings auto-fill into every document
- ✅ Job intake + per-job agreement selection
- ✅ Camera photo capture for pre-existing conditions (auto-downscaled)
- ✅ On-screen finger **initials + signatures** per document
- ✅ Generates a combined **signed PDF packet** (agreements + signatures + photos)
- ✅ All jobs saved locally on the device (IndexedDB); reopen + re-download

## Coming in Phase 2
- ☁️ Google Drive sign-in + auto-upload of the packet into a per-job folder
- The app already tracks a `syncState` (`local` / `pending`) and shows a sync
  chip, ready to wire to Drive.

## Run it
It's static files — no build step.

```bash
cd field-app
python3 -m http.server 8000
# open http://localhost:8000 on the same network from the iPad's Safari
```

For real use, publish this folder via **GitHub Pages** and open the URL on the
iPad, then **Share → Add to Home Screen** for a full-screen app icon.

> Camera + service worker require **HTTPS** (or `localhost`). GitHub Pages is
> HTTPS, so it works there out of the box.

## Files
| File | Purpose |
|------|---------|
| `index.html` | App shell / screens |
| `styles.css` | iPad-first styling |
| `agreements.js` | All 8 agreements as structured data |
| `storage.js` | IndexedDB (offline storage) |
| `pdf.js` | Builds the signed PDF via pdf-lib |
| `app.js` | App controller / flow |
| `sw.js` | Service worker (offline cache) |
| `vendor/` | pdf-lib + signature_pad (vendored, no CDN) |
| `icons/` | App icons |

## First-time setup on the iPad
1. Open the published URL in Safari.
2. Tap **⚙️ Company Settings** and fill in your company name, license #, state,
   liability cap, claim window, warranty period. (Saved on the device.)
3. Tap **Start New Job** and go.
