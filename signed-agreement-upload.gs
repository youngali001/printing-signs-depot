/**
 * Printing & Signs Depot — Signed Agreement → Google Drive uploader
 * ----------------------------------------------------------------------
 * This Google Apps Script runs under YOUR Google account. When the offer
 * page (offer.html) is signed and submitted, it POSTs the signed agreement
 * here, and this script saves it into a folder in your Google Drive.
 *
 * Deploy steps are in SIGNED-AGREEMENT-SETUP.md.
 */

// Folder in your Drive where signed agreements are saved (created if missing).
var FOLDER_NAME = 'Signed Agreements - Printing & Signs Depot';

// Also save a PDF copy alongside the HTML record? (best-effort conversion)
var ALSO_SAVE_PDF = true;

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    var folder = getOrCreateFolder(FOLDER_NAME);

    var safeName = String(data.customerName || 'Customer')
      .replace(/[^\w\- ]/g, '')
      .trim() || 'Customer';
    var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HH-mm');
    var base = 'Signed Agreement - ' + safeName + ' - ' + stamp;

    var html = data.fullDocumentHtml || buildFallbackHtml(data);
    var htmlBlob = Utilities.newBlob(html, 'text/html', base + '.html');
    var htmlFile = folder.createFile(htmlBlob);

    var pdfUrl = '';
    if (ALSO_SAVE_PDF) {
      try {
        var pdfBlob = htmlBlob.getAs('application/pdf').setName(base + '.pdf');
        pdfUrl = folder.createFile(pdfBlob).getUrl();
      } catch (pdfErr) {
        // PDF conversion is best-effort; the HTML copy is always saved.
      }
    }

    return json({ ok: true, htmlUrl: htmlFile.getUrl(), pdfUrl: pdfUrl });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

// Friendly response if you open the Web App URL in a browser.
function doGet() {
  return json({ ok: true, message: 'Signed-agreement uploader is live. POST signed agreements here.' });
}

function getOrCreateFolder(name) {
  var it = DriveApp.getFoldersByName(name);
  return it.hasNext() ? it.next() : DriveApp.createFolder(name);
}

// Used only if the page didn't send a prebuilt document (defensive).
function buildFallbackHtml(data) {
  var terms = (data.terms || []).map(function (t) { return '<li>' + t + '</li>'; }).join('');
  return '<!DOCTYPE html><html><body style="font-family:Arial;max-width:720px;margin:24px auto;">' +
    '<h1>Printing &amp; Signs Depot — Signed Agreement</h1>' +
    '<p><b>Package:</b> ' + (data.package || '') + ' (' + (data.price || '') + ')</p>' +
    '<ul>' + terms + '</ul>' +
    '<p><b>Customer:</b> ' + (data.customerName || '') + '</p>' +
    '<p><b>Business:</b> ' + (data.business || '—') + '</p>' +
    '<p><b>Date:</b> ' + (data.date || '') + '</p>' +
    '<p><b>Agreed:</b> ' + (data.agreed ? 'Yes' : 'No') + '</p>' +
    (data.signatureDataUrl ? '<p><img src="' + data.signatureDataUrl + '" style="max-width:320px;"></p>' : '') +
    '<p><b>Submitted:</b> ' + (data.submittedAt || '') + '</p>' +
    '</body></html>';
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
