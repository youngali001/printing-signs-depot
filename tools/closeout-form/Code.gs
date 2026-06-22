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
  EMAIL_TO: 'info@ccbizcenter.com'
};
// ===================================================================

// Serve the form (index.html lives in the same Apps Script project).
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Cross Creek Pak N Ship — Close-Out')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
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
