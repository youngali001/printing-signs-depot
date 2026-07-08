/* ============================================================================
 * pdf.js — Builds the signed agreement packet PDF from a job, using pdf-lib.
 *
 * Layout: cover page (job + company info) → each selected agreement with its
 * text, filled fields, initials and signatures → pre-existing condition photos.
 * Returns a Uint8Array (PDF bytes) that gets stored locally and later uploaded.
 * ========================================================================== */

const PDFGen = (() => {
  const MARGIN = 50;
  const PAGE_W = 612;   // US Letter
  const PAGE_H = 792;
  const FONT_SIZE = 10;
  const LINE = 14;
  const HEAD_SIZE = 12;

  function fill(text, settings, job) {
    if (!text) return '';
    const map = {
      '[COMPANY LEGAL NAME]': settings.companyLegalName,
      '[DBA / TRADE NAME]': settings.dbaName,
      '[STATE LICENSE #]': settings.license,
      '[STATE]': settings.state,
      '[COUNTY]': settings.county,
      '[LIABILITY CAP]': settings.liabilityCap,
      '[CLAIM WINDOW]': settings.claimWindow,
      '[WARRANTY PERIOD]': settings.warrantyPeriod,
      '{{customerName}}': job.data.customerName,
      '{{address}}': job.data.address,
      '{{jobNumber}}': job.data.jobNumber,
      '{{date}}': job.data.date,
    };
    let out = text;
    for (const [k, v] of Object.entries(map)) {
      if (v) out = out.split(k).join(v);
    }
    return out;
  }

  async function build(job, settings) {
    const { PDFDocument, StandardFonts, rgb } = PDFLib;
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);

    let page = doc.addPage([PAGE_W, PAGE_H]);
    let y = PAGE_H - MARGIN;

    const newPage = () => { page = doc.addPage([PAGE_W, PAGE_H]); y = PAGE_H - MARGIN; };
    const ensure = (need) => { if (y - need < MARGIN) newPage(); };

    const wrap = (text, f, size, maxW) => {
      const words = String(text).split(/\s+/);
      const lines = [];
      let cur = '';
      for (const w of words) {
        const test = cur ? cur + ' ' + w : w;
        if (f.widthOfTextAtSize(test, size) > maxW && cur) { lines.push(cur); cur = w; }
        else cur = test;
      }
      if (cur) lines.push(cur);
      return lines;
    };

    const drawText = (text, { f = font, size = FONT_SIZE, gap = LINE, indent = 0, color = rgb(0, 0, 0) } = {}) => {
      const maxW = PAGE_W - MARGIN * 2 - indent;
      for (const line of wrap(text, f, size, maxW)) {
        ensure(gap);
        page.drawText(line, { x: MARGIN + indent, y, size, font: f, color });
        y -= gap;
      }
    };

    const hr = () => { ensure(12); page.drawLine({ start: { x: MARGIN, y: y }, end: { x: PAGE_W - MARGIN, y: y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) }); y -= 12; };

    /* ---------------- Cover page ---------------- */
    drawText(settings.dbaName || settings.companyLegalName || 'Handyman Services', { f: bold, size: 20, gap: 26 });
    if (settings.license) drawText('License #' + settings.license, { size: 10, gap: 16, color: rgb(0.3, 0.3, 0.3) });
    y -= 6;
    drawText('SIGNED AGREEMENT PACKET', { f: bold, size: 14, gap: 22 });
    hr();
    drawText('Customer: ' + (job.data.customerName || ''), { f: bold, size: 11, gap: 18 });
    drawText('Service address: ' + (job.data.address || ''), { size: 11, gap: 18 });
    drawText('Job / Quote #: ' + (job.data.jobNumber || ''), { size: 11, gap: 18 });
    drawText('Date: ' + (job.data.date || ''), { size: 11, gap: 18 });
    drawText('Signed on device: ' + new Date(job.updatedAt || Date.now()).toLocaleString(), { size: 11, gap: 18 });
    y -= 6;
    const included = AGREEMENTS.filter(a => job.data.selected.includes(a.id)).map(a => a.code + ' ' + a.title);
    drawText('Documents included:', { f: bold, size: 11, gap: 16 });
    included.forEach(t => drawText('• ' + t, { size: 10, gap: 14, indent: 10 }));
    y -= 10;
    drawText('This electronic record was signed in person on the device named above. ' +
      'By signing, the customer consented to do business electronically (ESIGN/UETA). ' +
      'Template documents — not legal advice.', { size: 8, gap: 11, color: rgb(0.45, 0.45, 0.45) });

    /* ---------------- Each agreement ---------------- */
    for (const ag of AGREEMENTS) {
      if (!job.data.selected.includes(ag.id)) continue;
      newPage();
      drawText(ag.code + ' — ' + ag.title, { f: bold, size: 16, gap: 24 });
      hr();

      // Filled fields (scope, pricing, etc.)
      if (ag.fields) {
        for (const fld of ag.fields) {
          const val = (job.data.docFields?.[ag.id]?.[fld.key]) || '';
          drawText(fld.label + ':', { f: bold, size: 10, gap: 14 });
          drawText(val || '—', { size: 10, gap: 14, indent: 10 });
          y -= 4;
        }
      }

      for (const b of ag.blocks) {
        if (b.h) { y -= 4; drawText(b.h, { f: bold, size: HEAD_SIZE, gap: 16 }); }
        else if (b.p) { drawText(fill(b.p, settings, job), { gap: LINE }); y -= 4; }
        else if (b.li) {
          b.li.forEach((item, i) => { drawText((i + 1) + '. ' + fill(item, settings, job), { gap: LINE, indent: 12 }); });
          y -= 4;
        }
        else if (b.initial) {
          const img = job.data.initials?.[b.initial];
          ensure(46);
          y -= 4;
          drawText('Initials:', { f: bold, size: 9, gap: 12 });
          if (img) {
            const png = await doc.embedPng(img);
            const h = 30, w = h * (png.width / png.height);
            ensure(h + 6);
            page.drawImage(png, { x: MARGIN + 60, y: y - h + 24, width: Math.min(w, 90), height: h });
          }
          drawText(fill(b.label, settings, job), { size: 9, gap: 12, indent: 60, color: rgb(0.3, 0.3, 0.3) });
          y -= 8;
        }
        else if (b.sign) {
          const sig = job.data.signatures?.[ag.id + ':' + b.sign];
          ensure(70);
          y -= 8;
          if (sig?.image) {
            const png = await doc.embedPng(sig.image);
            const h = 40, w = h * (png.width / png.height);
            page.drawImage(png, { x: MARGIN, y: y - h + 30, width: Math.min(w, 200), height: h });
          }
          page.drawLine({ start: { x: MARGIN, y: y }, end: { x: MARGIN + 230, y: y }, thickness: 0.7, color: rgb(0, 0, 0) });
          y -= 12;
          const who = b.sign === 'customer' ? (job.data.customerName || 'Customer') : (settings.repName || 'Company representative');
          drawText(b.label + ':  ' + who + (sig?.at ? '   (' + new Date(sig.at).toLocaleString() + ')' : ''), { size: 9, gap: 14, color: rgb(0.2, 0.2, 0.2) });
          y -= 6;
        }
      }
    }

    /* ---------------- Condition photos ---------------- */
    const photos = job.data.photos || [];
    if (photos.length) {
      newPage();
      drawText('Pre-Existing Condition Photos', { f: bold, size: 16, gap: 24 });
      hr();
      for (const ph of photos) {
        try {
          const bytes = await blobToBytes(ph.blob);
          const img = ph.type === 'image/png' ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
          const maxW = PAGE_W - MARGIN * 2;
          const scale = Math.min(maxW / img.width, 300 / img.height);
          const w = img.width * scale, h = img.height * scale;
          ensure(h + 30);
          drawText((ph.area || 'Photo') + (ph.note ? ' — ' + ph.note : '') + '   [' + new Date(ph.at).toLocaleString() + ']', { f: bold, size: 9, gap: 14 });
          page.drawImage(img, { x: MARGIN, y: y - h, width: w, height: h });
          y -= h + 16;
        } catch (e) { drawText('[photo could not be embedded]', { size: 9, gap: 14 }); }
      }
    }

    return doc.save();
  }

  function blobToBytes(blob) {
    return blob.arrayBuffer().then(ab => new Uint8Array(ab));
  }

  return { build };
})();

if (typeof window !== 'undefined') window.PDFGen = PDFGen;
