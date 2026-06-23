/**
 * Cross Creek Pak N Ship — End-of-Day Close-Out
 * Google Apps Script backend.
 *
 * What it does on submit:
 *   1. Appends one summary row per day to the "Closeouts" sheet.
 *   2. Appends one row per employee to the "Employees" sheet (per-employee tracking).
 *   3. Saves the category-code report photo into a preset Drive folder and stores its link.
 *   4. (Optional) emails the summary + photo to the store inbox.
 *
 * SETUP: fill in the three IDs below, then deploy as a Web App.
 * Full step-by-step is in README.md in this folder.
 */

// ======================= CONFIG — EDIT THESE =======================
var CONFIG = {
  // Google Sheet that will hold the data. Create a blank sheet, copy the long
  // ID from its URL: docs.google.com/spreadsheets/d/<<THIS_PART>>/edit
  SHEET_ID: 'PASTE_GOOGLE_SHEET_ID_HERE',

  // Drive folder where report photos get filed. Open the folder in Drive, copy
  // the ID from the URL: drive.google.com/drive/folders/<<THIS_PART>>
  FOLDER_ID: 'PASTE_DRIVE_FOLDER_ID_HERE',

  // Where to email each close-out. Set SEND_EMAIL to false to turn email off.
  SEND_EMAIL: true,
  EMAIL_TO: 'info@ccbizcenter.com',

  // Reads the category-code report photo automatically. Get a free key at
  // https://aistudio.google.com/apikey and paste it here. Leave the placeholder
  // to disable auto-read (staff just type postage/prepaid by hand).
  GEMINI_API_KEY: 'PASTE_GEMINI_API_KEY_HERE',
  GEMINI_MODEL: 'gemini-2.5-flash'
};
// ===================================================================

// Serve the form (index.html lives in the same Apps Script project).
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Cross Creek Pak N Ship — Close-Out')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

/**
 * Called by the form when a photo is attached:
 * google.script.run.extractReport(base64, mimeType).
 * Sends the photo to Gemini Vision and returns structured report data.
 */
function extractReport(photoData, photoType) {
  if (!CONFIG.GEMINI_API_KEY || CONFIG.GEMINI_API_KEY.indexOf('PASTE') === 0) {
    throw new Error('Auto-read is off (no Gemini API key set).');
  }

  var prompt = [
    'You are reading a USPS CPU "Category Code Report" printed on a receipt.',
    'Extract ALL data and return ONLY valid JSON with exactly this shape:',
    '{',
    '  "businessDate": "MM/DD/YYYY or empty string",',
    '  "sections": [',
    '    { "name": "section name", "lines": [ { "cat": "code", "description": "text", "qty": 0, "value": 0 } ],',
    '      "subtotalValue": 0, "subtotalQty": 0 }',
    '  ],',
    '  "grandTotalValue": 0, "grandTotalQty": 0,',
    '  "prepaidQty": 0, "prepaidValue": 0',
    '}',
    'Rules:',
    '- Sections may include "Mailing Services", "Special Services", "Affixed Postage", "Prepaid Mail".',
    '- "cat" is the short code (e.g. PRPE, FCML, PKGS, CERM). "description" is the text after it.',
    '- Numbers are plain numbers, no "$". Parentheses mean negative: ($15.75) => -15.75.',
    '- prepaidQty/prepaidValue = the "Prepaid Mail" section subtotal (qty and value); 0 if none.',
    '- grandTotalValue/grandTotalQty = the final "Total (Price)/(Qty)" line.',
    '- If something is unreadable use 0. Do not invent lines.'
  ].join('\n');

  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
    CONFIG.GEMINI_MODEL + ':generateContent?key=' + CONFIG.GEMINI_API_KEY;
  var body = {
    contents: [{ parts: [
      { text: prompt },
      { inline_data: { mime_type: photoType || 'image/jpeg', data: photoData } }
    ]}],
    generationConfig: { response_mime_type: 'application/json', temperature: 0 }
  };

  var res = UrlFetchApp.fetch(url, {
    method: 'post', contentType: 'application/json',
    payload: JSON.stringify(body), muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) {
    throw new Error('Gemini ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 150));
  }
  var out = JSON.parse(res.getContentText());
  var text = out.candidates && out.candidates[0].content.parts[0].text;
  if (!text) throw new Error('Empty response from Gemini.');
  return JSON.parse(text);
}

/**
 * Called by the form via google.script.run.submitCloseout(payload).
 * Returns a short status string shown to the user.
 */
function submitCloseout(data) {
  var ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);

  // 1) Save the photo to Drive ----------------------------------------
  var photoUrl = '';
  if (data.photoData) {
    var folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
    var ext = (data.photoName && data.photoName.indexOf('.') > -1)
      ? data.photoName.substring(data.photoName.lastIndexOf('.'))
      : '.jpg';
    var safeCloser = (data.closedBy || 'unknown').replace(/[^\w\-]+/g, '_');
    var fileName = data.date + '_category-report_' + safeCloser + ext;
    var bytes = Utilities.base64Decode(data.photoData);
    var blob = Utilities.newBlob(bytes, data.photoType || 'image/jpeg', fileName);
    var file = folder.createFile(blob);
    photoUrl = file.getUrl();
  }

  // 2) Summary row in "Closeouts" -------------------------------------
  var sheet = getOrCreateSheet(ss, 'Closeouts', [
    'Timestamp', 'Date', 'Closed by', 'Cash ($)', 'CC payments (#)',
    'CC total ($)', 'Total sales ($)', 'Money in register ($)',
    'Stamps used ($)', 'Postage left in CRM ($)', 'Prepaid pkgs', 'Voided pkgs',
    '# Employees', 'Report photo'
  ]);
  sheet.appendRow([
    new Date(), data.date, data.closedBy, data.cash, data.ccCount,
    data.ccTotal, data.totalSales, data.drawer, data.stamps, data.postageLeft,
    data.prepaid, data.voided, (data.employees || []).length, photoUrl
  ]);

  // 3) One row per employee in "Employees" ----------------------------
  var emps = data.employees || [];
  if (emps.length) {
    var empSheet = getOrCreateSheet(ss, 'Employees', [
      'Timestamp', 'Date', 'Employee', 'Clock in', 'Clock out',
      'Customers helped', 'Told notary', 'Told passport', 'Closed by'
    ]);
    var now = new Date();
    emps.forEach(function (e) {
      empSheet.appendRow([
        now, data.date, e.name, e.clockIn, e.clockOut,
        e.customers, e.notary, e.passport, data.closedBy
      ]);
    });
  }

  // 3b) Full report line-items in "Report Lines" ----------------------
  var rd = data.reportData;
  if (rd && rd.sections && rd.sections.length) {
    var rlSheet = getOrCreateSheet(ss, 'Report Lines', [
      'Timestamp', 'Date', 'Section', 'CAT', 'Description', 'Qty', 'Value ($)'
    ]);
    var rlTime = new Date();
    rd.sections.forEach(function (sec) {
      (sec.lines || []).forEach(function (ln) {
        rlSheet.appendRow([
          rlTime, data.date, sec.name, ln.cat, ln.description, ln.qty, ln.value
        ]);
      });
    });
  }

  // 4) Optional email -------------------------------------------------
  if (CONFIG.SEND_EMAIL && CONFIG.EMAIL_TO) {
    sendSummaryEmail(data, photoUrl);
  }

  return 'Close-out recorded for ' + data.date + '.';
}

// ---- helpers --------------------------------------------------------

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function sendSummaryEmail(data, photoUrl) {
  var lines = [
    'Cross Creek Pak N Ship — End-of-Day Close-Out',
    '',
    'Date: ' + data.date,
    'Closed by: ' + data.closedBy,
    '',
    'Cash collected: $' + Number(data.cash).toFixed(2),
    'Credit card payments: ' + data.ccCount + ' (total $' + Number(data.ccTotal).toFixed(2) + ')',
    'Total sales: $' + Number(data.totalSales).toFixed(2),
    'Money left in register: $' + Number(data.drawer).toFixed(2),
    '',
    'Stamps/postage used: $' + Number(data.stamps).toFixed(2),
    'Postage left in CRM: $' + Number(data.postageLeft).toFixed(2),
    'Prepaid packages: ' + data.prepaid,
    'Voided packages: ' + data.voided,
    '',
    'Report photo: ' + (photoUrl || '(none)'),
    '',
    'Employees:'
  ];
  (data.employees || []).forEach(function (e) {
    lines.push('  • ' + e.name + ' | in ' + (e.clockIn || '-') + ' out ' + (e.clockOut || '-') +
      ' | customers ' + e.customers + ' | notary ' + e.notary + ' | passport ' + e.passport);
  });
  if (!(data.employees || []).length) lines.push('  (none entered)');

  MailApp.sendEmail({
    to: CONFIG.EMAIL_TO,
    subject: 'Close-Out ' + data.date + ' — ' + data.closedBy,
    body: lines.join('\n')
  });
}
