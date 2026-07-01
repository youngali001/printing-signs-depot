/* ============================================================================
 * app.js — Field Agreements PWA controller (Phase 1: fully offline).
 *
 * Flow:  Home → Intake (details + pick docs) → Conditions (photos)
 *        → Sign (initials + signatures per doc) → Finish (generate PDF).
 * Everything persists to IndexedDB after each step, so nothing is lost.
 * ========================================================================== */

const App = (() => {
  const DEFAULT_SETTINGS = {
    companyLegalName: '', dbaName: '', license: '', state: '', county: '',
    liabilityCap: 'the total amount paid for the job', claimWindow: '7',
    warrantyPeriod: '90', repName: '',
  };

  const STEPS = ['intake', 'conditions', 'sign', 'finish'];
  let settings = { ...DEFAULT_SETTINGS };
  let job = null;          // the job currently being edited
  let stepIndex = 0;       // index within STEPS while in a job
  let sigPad = null;       // SignaturePad instance
  let sigTarget = null;    // where the current signature/initials will be stored

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const el = (id) => document.getElementById(id);

  /* ------------------------------------------------------------- helpers */
  function uid() { return 'job_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function showScreen(name) {
    $$('.screen').forEach(s => s.classList.remove('active'));
    el('screen-' + name).classList.add('active');
    window.scrollTo(0, 0);
  }

  function setActionBar(visible, { nextLabel = 'Next', backLabel = 'Back' } = {}) {
    const bar = el('actionbar');
    bar.classList.toggle('hidden', !visible);
    el('btnNext').textContent = nextLabel;
    el('btnBack').textContent = backLabel;
  }

  async function refreshSyncChip() {
    const chip = el('syncChip');
    const configured = await DB.getSetting('googleConfigured', false);
    if (!configured) { chip.className = 'sync-chip'; chip.textContent = '☁︎ Drive: not set up'; return; }
    const jobs = await DB.allJobs();
    const pending = jobs.filter(j => j.syncState === 'pending').length;
    if (pending) { chip.className = 'sync-chip pending'; chip.textContent = '⧗ ' + pending + ' to upload'; }
    else { chip.className = 'sync-chip ok'; chip.textContent = '✓ All synced'; }
  }

  /* ------------------------------------------------------------- settings */
  async function loadSettings() {
    const saved = await DB.getSetting('company', null);
    settings = { ...DEFAULT_SETTINGS, ...(saved || {}) };
  }
  function fillSettingsForm() {
    Object.keys(DEFAULT_SETTINGS).forEach(k => { const i = el('set-' + k); if (i) i.value = settings[k] || ''; });
  }
  async function saveSettingsFromForm() {
    Object.keys(DEFAULT_SETTINGS).forEach(k => { const i = el('set-' + k); if (i) settings[k] = i.value.trim(); });
    await DB.setSetting('company', settings);
    toast('Settings saved');
    showHome();
  }

  /* ------------------------------------------------------------- home */
  async function showHome() {
    setActionBar(false);
    await renderJobList();
    await refreshSyncChip();
    showScreen('home');
  }

  async function renderJobList() {
    const list = el('jobList');
    const jobs = await DB.allJobs();
    if (!jobs.length) { list.innerHTML = '<div class="empty">No jobs yet. Tap “Start New Job”.</div>'; return; }
    list.innerHTML = '';
    for (const j of jobs) {
      const div = document.createElement('div');
      div.className = 'job-item';
      const signed = j.status === 'signed';
      div.innerHTML =
        '<div class="info"><div class="n">' + esc(j.data.customerName || 'Untitled') + '</div>' +
        '<div class="d">' + esc(j.data.address || '') + ' · ' + esc(j.data.date || '') +
        ' · ' + new Date(j.updatedAt).toLocaleDateString() + '</div></div>' +
        '<span class="badge ' + (signed ? 'signed' : 'draft') + '">' + (signed ? 'Signed' : 'Draft') + '</span>';
      div.addEventListener('click', () => openJob(j.id, signed));
      list.appendChild(div);
    }
  }

  async function openJob(id, signed) {
    job = await DB.getJob(id);
    if (!job) return;
    if (signed && job.data.pdf) {
      // Signed job: offer to re-download PDF
      downloadPdf(job);
      return;
    }
    stepIndex = 0;
    startJobFlow();
  }

  /* ------------------------------------------------------------- new job */
  function newJob() {
    job = {
      id: uid(), status: 'draft', syncState: 'local',
      data: {
        customerName: '', address: '', jobNumber: '',
        date: new Date().toISOString().slice(0, 10),
        selected: AGREEMENTS.filter(a => a.defaultOn).map(a => a.id),
        docFields: {}, initials: {}, signatures: {}, photos: [],
      },
    };
    stepIndex = 0;
    startJobFlow();
  }

  function startJobFlow() {
    renderStep();
  }

  /* ------------------------------------------------------------- steps */
  function renderStep() {
    const step = STEPS[stepIndex];
    if (step === 'intake') renderIntake();
    else if (step === 'conditions') renderConditions();
    else if (step === 'sign') renderSign();
    else if (step === 'finish') renderFinish();
    setActionBar(true, {
      nextLabel: stepIndex === STEPS.length - 1 ? 'Finish' : 'Next →',
      backLabel: stepIndex === 0 ? 'Cancel' : '← Back',
    });
    showScreen(step);
  }

  async function nextStep() {
    // Persist current screen's inputs before moving on
    if (STEPS[stepIndex] === 'intake') captureIntake();
    await persist();
    if (stepIndex < STEPS.length - 1) { stepIndex++; renderStep(); }
  }
  async function prevStep() {
    if (STEPS[stepIndex] === 'intake') { captureIntake(); await persist(); showHome(); return; }
    stepIndex--; renderStep();
  }

  async function persist() { if (job) await DB.saveJob(job); await refreshSyncChip(); }

  /* ---- Step 1: intake ---- */
  function renderIntake() {
    el('job-customerName').value = job.data.customerName || '';
    el('job-address').value = job.data.address || '';
    el('job-jobNumber').value = job.data.jobNumber || '';
    el('job-date').value = job.data.date || '';
    renderPickList();
  }
  function captureIntake() {
    job.data.customerName = el('job-customerName').value.trim();
    job.data.address = el('job-address').value.trim();
    job.data.jobNumber = el('job-jobNumber').value.trim();
    job.data.date = el('job-date').value;
  }
  function renderPickList() {
    const wrap = el('pickList');
    wrap.innerHTML = '';
    AGREEMENTS.forEach(ag => {
      const on = job.data.selected.includes(ag.id);
      const row = document.createElement('div');
      row.className = 'pick' + (on ? ' on' : '');
      row.innerHTML =
        '<div class="toggle">' + (on ? '✓' : '') + '</div>' +
        '<div class="meta"><div class="t">' + esc(ag.title) + '</div><div class="w">' + esc(ag.when) + '</div></div>' +
        '<div class="code">' + ag.code + '</div>';
      row.addEventListener('click', () => {
        const i = job.data.selected.indexOf(ag.id);
        if (i >= 0) job.data.selected.splice(i, 1); else job.data.selected.push(ag.id);
        renderPickList();
      });
      wrap.appendChild(row);
    });
  }

  /* ---- Step 2: conditions + photos ---- */
  function renderConditions() {
    const sel = el('photo-area');
    if (!sel.options.length) CONDITION_AREAS.forEach(a => { const o = document.createElement('option'); o.value = a; o.textContent = a; sel.appendChild(o); });
    renderPhotoGrid();
  }
  function renderPhotoGrid() {
    const grid = el('photoGrid');
    grid.innerHTML = '';
    job.data.photos.forEach((ph, idx) => {
      const url = URL.createObjectURL(ph.blob);
      const tile = document.createElement('div');
      tile.className = 'photo-tile';
      tile.innerHTML = '<img src="' + url + '"><div class="cap">' + esc(ph.area) + '</div><button class="rm">×</button>';
      tile.querySelector('.rm').addEventListener('click', async (e) => {
        e.stopPropagation();
        job.data.photos.splice(idx, 1); await persist(); renderPhotoGrid();
      });
      grid.appendChild(tile);
    });
  }
  async function onPhotoPicked(file) {
    if (!file) return;
    const blob = await downscaleImage(file, 1600, 0.8);
    job.data.photos.push({
      area: el('photo-area').value, note: el('photo-note').value.trim(),
      at: Date.now(), type: blob.type, blob,
    });
    el('photo-note').value = '';
    await persist();
    renderPhotoGrid();
  }

  /* ---- Step 3: sign each document ---- */
  function renderSign() {
    const cont = el('docContainer');
    cont.innerHTML = '';
    const selected = AGREEMENTS.filter(a => job.data.selected.includes(a.id));
    if (!selected.length) { cont.innerHTML = '<div class="card"><div class="empty">No documents selected.</div></div>'; return; }

    selected.forEach(ag => {
      const card = document.createElement('div');
      card.className = 'card';
      let html = '<h2>' + ag.code + ' — ' + esc(ag.title) + '</h2><div class="sub">' + esc(ag.when) + '</div>';

      // Editable fields (scope, pricing, etc.)
      if (ag.fields) {
        html += '<div class="doc-fields">';
        ag.fields.forEach(f => {
          const val = (job.data.docFields[ag.id] && job.data.docFields[ag.id][f.key]) || '';
          const input = f.type === 'textarea'
            ? '<textarea data-doc="' + ag.id + '" data-key="' + f.key + '">' + esc(val) + '</textarea>'
            : '<input type="text" data-doc="' + ag.id + '" data-key="' + f.key + '" value="' + esc(val) + '">';
          html += '<label class="field"><span>' + esc(f.label) + '</span>' + input + '</label>';
        });
        html += '</div>';
      }

      // Body text
      html += '<div class="doc-body">' + renderBlocksHtml(ag) + '</div>';
      card.innerHTML = html;

      // Wire field inputs
      card.querySelectorAll('[data-doc]').forEach(inp => {
        inp.addEventListener('input', () => {
          const d = inp.getAttribute('data-doc'), k = inp.getAttribute('data-key');
          job.data.docFields[d] = job.data.docFields[d] || {};
          job.data.docFields[d][k] = inp.value;
        });
        inp.addEventListener('blur', persist);
      });

      // Wire initials + signature slots
      ag.blocks.forEach(b => {
        if (b.initial) wireInitial(card, ag, b);
        if (b.sign) wireSign(card, ag, b);
      });

      cont.appendChild(card);
    });
  }

  function renderBlocksHtml(ag) {
    let out = '';
    ag.blocks.forEach((b, i) => {
      if (b.h) out += '<h3>' + esc(b.h) + '</h3>';
      else if (b.p) out += '<p>' + esc(fillText(b.p)) + '</p>';
      else if (b.li) out += '<ol>' + b.li.map(x => '<li>' + esc(fillText(x)) + '</li>').join('') + '</ol>';
      else if (b.initial) {
        const has = job.data.initials[b.initial];
        out += '<div class="initial-slot' + (has ? ' done' : '') + '" data-initial="' + b.initial + '">' +
          '<div class="lab">' + esc(fillText(b.label)) + '</div>' +
          '<div class="box">' + (has ? '<img src="' + has + '">' : 'Tap<br>initials') + '</div></div>';
      }
      else if (b.sign) {
        const key = ag.id + ':' + b.sign;
        const sig = job.data.signatures[key];
        out += '<div class="sig-slot' + (sig ? ' done' : '') + '" data-sign="' + key + '">' +
          '<div class="lab">' + esc(b.label) + (sig && sig.at ? ' — signed ' + new Date(sig.at).toLocaleString() : '') + '</div>' +
          '<div class="sig-preview">' + (sig ? '<img src="' + sig.image + '">' : '<button class="btn small">✍️ Tap to sign</button>') + '</div></div>';
      }
    });
    return out;
  }

  function wireInitial(card, ag, b) {
    const slot = card.querySelector('[data-initial="' + b.initial + '"]');
    if (slot) slot.addEventListener('click', () => openSignature({
      kind: 'initials', title: 'Initial here', hint: fillText(b.label),
      onSave: async (dataUrl) => { job.data.initials[b.initial] = dataUrl; await persist(); renderSign(); },
    }));
  }
  function wireSign(card, ag, b) {
    const key = ag.id + ':' + b.sign;
    const slot = card.querySelector('[data-sign="' + key + '"]');
    if (slot) slot.addEventListener('click', () => openSignature({
      kind: 'signature',
      title: b.sign === 'customer' ? 'Customer signature' : 'Company signature',
      hint: ag.code + ' — ' + ag.title,
      onSave: async (dataUrl) => { job.data.signatures[key] = { image: dataUrl, at: Date.now() }; await persist(); renderSign(); },
    }));
  }

  /* ---- Step 4: finish ---- */
  function renderFinish() {
    el('finishResult').innerHTML = '';
    const selected = AGREEMENTS.filter(a => job.data.selected.includes(a.id));
    let html = '<ul style="padding-left:18px;">';
    let missing = 0;
    selected.forEach(ag => {
      const need = [];
      ag.blocks.forEach(b => {
        if (b.initial && !job.data.initials[b.initial]) { need.push('initials'); }
        if (b.sign === 'customer' && !job.data.signatures[ag.id + ':customer']) { need.push('customer signature'); }
      });
      const ok = need.length === 0;
      if (!ok) missing++;
      html += '<li>' + (ok ? '✅ ' : '⚠️ ') + esc(ag.code + ' ' + ag.title) +
        (ok ? '' : ' — <span style="color:#D4286E">missing ' + esc([...new Set(need)].join(', ')) + '</span>') + '</li>';
    });
    html += '</ul>';
    html += '<p style="color:#5A6B7B;font-size:14px;">Photos captured: ' + job.data.photos.length + '</p>';
    el('finishSummary').innerHTML = html;
    el('btnGenerate').disabled = false;
    el('btnGenerate').textContent = missing ? '⚠️ Generate anyway (' + missing + ' incomplete)' : '✅ Generate signed packet';
  }

  async function generate() {
    el('btnGenerate').disabled = true;
    el('finishResult').innerHTML = '<p>Generating…</p>';
    try {
      const bytes = await PDFGen.build(job, settings);
      job.data.pdf = await bytesToBase64(bytes);
      job.status = 'signed';
      const configured = await DB.getSetting('googleConfigured', false);
      job.syncState = configured ? 'pending' : 'local';
      await persist();
      const size = Math.round(bytes.length / 1024);
      el('finishResult').innerHTML =
        '<div class="badge signed">Packet created (' + size + ' KB)</div>' +
        '<div class="spacer"></div>' +
        '<button class="btn" id="btnDl">⬇︎ Download / open PDF</button>' +
        '<div class="spacer"></div>' +
        '<button class="btn secondary" id="btnDone">Done — back to home</button>' +
        (configured ? '' : '<p style="font-size:13px;color:#5A6B7B;margin-top:12px;">Google Drive is not set up yet, so this is saved on the iPad only. Set it up in Phase 2 to auto-upload.</p>');
      el('btnDl').addEventListener('click', () => downloadPdf(job));
      el('btnDone').addEventListener('click', showHome);
      setActionBar(false);
      toast('Signed packet saved');
    } catch (e) {
      console.error(e);
      el('finishResult').innerHTML = '<p style="color:#D4286E">Error generating PDF: ' + esc(e.message) + '</p>';
      el('btnGenerate').disabled = false;
    }
  }

  function downloadPdf(j) {
    const bytes = base64ToBytes(j.data.pdf);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const name = 'Agreement-' + (j.data.customerName || 'job').replace(/[^a-z0-9]+/gi, '-') + '.pdf';
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 4000);
    // iPad Safari also opens it in a new tab for convenience
    window.open(url, '_blank');
  }

  /* ------------------------------------------------- signature modal */
  function openSignature({ kind, title, hint, onSave }) {
    sigTarget = { onSave };
    el('sigTitle').textContent = title;
    el('sigHint').textContent = hint || '';
    const canvas = el('sigPad');
    canvas.classList.toggle('initials', kind === 'initials');
    el('sigModal').classList.add('open');
    // Size canvas to its displayed size (retina-aware)
    requestAnimationFrame(() => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext('2d').scale(ratio, ratio);
      sigPad = new SignaturePad(canvas, { penColor: '#12233a', minWidth: 0.8, maxWidth: 2.6, backgroundColor: 'rgba(255,255,255,0)' });
    });
  }
  function closeSignature() { el('sigModal').classList.remove('open'); if (sigPad) { sigPad.off(); sigPad = null; } sigTarget = null; }
  function saveSignature() {
    if (!sigPad || sigPad.isEmpty()) { toast('Please sign first'); return; }
    const dataUrl = sigPad.toDataURL('image/png');
    const cb = sigTarget.onSave;
    closeSignature();
    cb(dataUrl);
  }

  /* ------------------------------------------------- image utils */
  function downscaleImage(file, maxDim, quality) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const scale = Math.min(1, maxDim / Math.max(width, height));
        width = Math.round(width * scale); height = Math.round(height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        canvas.toBlob(b => resolve(b || file), 'image/jpeg', quality);
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  }

  function bytesToBase64(bytes) {
    return new Promise((resolve) => {
      const blob = new Blob([bytes]);
      const r = new FileReader();
      r.onload = () => resolve(r.result.split(',')[1]);
      r.readAsDataURL(blob);
    });
  }
  function base64ToBytes(b64) {
    const bin = atob(b64); const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }

  /* ------------------------------------------------- misc */
  function fillText(t) {
    if (!t) return '';
    const map = {
      '[COMPANY LEGAL NAME]': settings.companyLegalName || '[Company legal name]',
      '[DBA / TRADE NAME]': settings.dbaName || '[DBA]',
      '[STATE LICENSE #]': settings.license || '[license #]',
      '[STATE]': settings.state || '[State]',
      '[COUNTY]': settings.county || '[County]',
      '[LIABILITY CAP]': settings.liabilityCap || '[liability cap]',
      '[CLAIM WINDOW]': settings.claimWindow || '[#]',
      '[WARRANTY PERIOD]': settings.warrantyPeriod || '[#]',
      '{{customerName}}': job?.data.customerName || '',
      '{{address}}': job?.data.address || '',
      '{{jobNumber}}': job?.data.jobNumber || '',
      '{{date}}': job?.data.date || '',
    };
    let out = t; for (const [k, v] of Object.entries(map)) out = out.split(k).join(v);
    return out;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  let toastTimer = null;
  function toast(msg) {
    let t = el('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast';
      t.style.cssText = 'position:fixed;bottom:96px;left:50%;transform:translateX(-50%);background:#1B2A3B;color:#fff;padding:12px 18px;border-radius:999px;z-index:200;font-size:15px;box-shadow:0 4px 16px rgba(0,0,0,.25)';
      document.body.appendChild(t); }
    t.textContent = msg; t.style.opacity = '1';
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.style.opacity = '0'; }, 1800);
  }

  /* ------------------------------------------------- wire up */
  function bind() {
    el('btnNewJob').addEventListener('click', newJob);
    el('btnSettings').addEventListener('click', () => { fillSettingsForm(); showScreen('settings'); setActionBar(false); });
    el('btnBackFromSettings').addEventListener('click', showHome);
    el('btnSaveSettings').addEventListener('click', saveSettingsFromForm);

    el('btnNext').addEventListener('click', nextStep);
    el('btnBack').addEventListener('click', prevStep);

    el('btnAddPhoto').addEventListener('click', () => el('photo-input').click());
    el('photo-input').addEventListener('change', (e) => { onPhotoPicked(e.target.files[0]); e.target.value = ''; });

    el('btnGenerate').addEventListener('click', generate);

    el('sigClear').addEventListener('click', () => sigPad && sigPad.clear());
    el('sigCancel').addEventListener('click', closeSignature);
    el('sigSave').addEventListener('click', saveSignature);
  }

  async function init() {
    bind();
    await loadSettings();
    await showHome();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
