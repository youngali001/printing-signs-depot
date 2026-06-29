# Save signed agreements to your Google Drive — easy setup

Goal: when a customer signs the offer page, a copy lands in your Google Drive
automatically.

You only do this **once**. It takes about 5 minutes. No cost.

Do the steps in order. Don't worry about what the code means — you're just
copying and pasting.

---

## Part 1 — Put the code online (so it can save to your Drive)

**Step 1.** Make sure you're signed in to the Google account where you want
the files saved (your q.ali.enterprise@gmail.com).

**Step 2.** Go to **https://script.google.com**

**Step 3.** Click the **New project** button (top left).

**Step 4.** You'll see a box with some sample code in it. Click inside that
box, select everything (**Ctrl+A**, or **Cmd+A** on Mac), and delete it so the
box is empty.

**Step 5.** In this project, open the file named **`signed-agreement-upload.gs`**.
Select all of it, copy it, and paste it into that empty box.

**Step 6.** Press **Ctrl+S** (Mac: **Cmd+S**) to save. If it asks for a project
name, type anything like `Agreements` and click OK.

✅ Part 1 done.

---

## Part 2 — Turn it on (publish it)

**Step 7.** Near the top right, click the blue **Deploy** button, then click
**New deployment**.

**Step 8.** Click the little gear ⚙ (top left of the popup) and choose
**Web app**.

**Step 9.** Fill in the boxes exactly like this:
- **Execute as:** **Me**
- **Who has access:** **Anyone**

**Step 10.** Click **Deploy**.

**Step 11.** It will ask for permission. Click **Authorize access**, choose
your Google account, and click **Allow**.
- If you see a scary "Google hasn't verified this app" screen, click
  **Advanced**, then **Go to … (unsafe)**. This is safe — it's your own code.

**Step 12.** A link appears that ends in **`/exec`**. Click **Copy** to copy
it. **Keep this link** — you need it in the next part.

✅ Part 2 done.

---

## Part 3 — Connect it to your offer page

**Step 13.** Open the file **`offer.html`**.

**Step 14.** Use Find (**Ctrl+F** / **Cmd+F**) and search for:
`UPLOAD_URL`

**Step 15.** You'll see this line:
```
var UPLOAD_URL = '';
```
Paste your link from Step 12 **between the two quotes**, so it looks like:
```
var UPLOAD_URL = 'https://script.google.com/macros/s/AKfycb..../exec';
```

**Step 16.** Save the file.

✅ Done! Signed agreements now save to your Drive automatically.

---

## Check that it works

1. Open **`offer.html`** in your web browser.
2. Click a package, check the **I agree** box, type a name, sign, and click
   **Confirm & Submit**.
3. Go to your Google Drive. You should see a folder called
   **Signed Agreements - Printing & Signs Depot** with your test inside it.

---

## If something's not right

- **No folder showed up?** Re-do Part 2. The two most common misses are
  **Execute as: Me** and **Who has access: Anyone**.
- **You want to double-check the link works:** paste your `/exec` link into a
  browser. You should see a short message starting with `{"ok":true`.
- **You changed the code later?** In script.google.com click **Deploy → Manage
  deployments → ✏️ (edit) → New version → Deploy**. (Your link stays the same.)
- **Leave `UPLOAD_URL` blank** any time and the page just shows a thank-you
  message instead of uploading. Nothing breaks.

Want it to also email you each signed copy, or you'd rather not deal with the
setup at all? Tell me and I'll set up an easier route.
