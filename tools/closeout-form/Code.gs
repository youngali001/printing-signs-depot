/**
 * Cross Creek Pak N Ship — Store Operations Web App
 * Google Apps Script backend.
 *
 * One deployment serves three pages (routed by ?page=):
 *   (default)    End-of-day close-out
 *   ?page=open   Opening / start-of-day (counts starting bank + checklist)
 *   ?page=appt   Notary / passport appointment log
 *
 * On CLOSE-OUT submit it:
 *   1. Computes expected drawer + over/short and appends a row to "Closeouts".
 *   2. Logs each employee to "Employees".
 *   3. Saves every line of the category-code report to "Report Lines".
 *   4. Saves the report photo to a Drive folder.
 *   5. Emails the summary, plus a low-postage alert when the CRM balance is low.
 *
 * Helpers the form calls live: validatePin, getOpeningBank, closeoutExists,
 *   extractReport (Gemini photo auto-read), submitCloseout, openShift,
 *   logAppointment.
 * Optional scheduled triggers: sendWeeklySummary, sendMonthlySummary.
 * Run once from the editor to build the analytics tab: buildDashboard.
 *
 * SETUP: fill CONFIG below, then deploy as a Web App. See README.md.
 */

// ======================= CONFIG — EDIT THESE =======================
var CONFIG = {
  // Google Sheet that holds the data (ID from its URL).
  SHEET_ID: 'PASTE_GOOGLE_SHEET_ID_HERE',

  // Drive folder where report photos get filed (ID from its URL).
  FOLDER_ID: '1NAhDuRdNXuoSmqZ1kZefT8kj8NreVL3n',

  // Daily summary email. Set SEND_EMAIL false to turn off.
  SEND_EMAIL: true,
  EMAIL_TO: 'info@ccbizcenter.com',

  // Photo auto-read. Free key: https://aistudio.google.com/apikey
  // Leave the placeholder to disable auto-read (staff type postage/prepaid).
  GEMINI_API_KEY: 'PASTE_GEMINI_API_KEY_HERE',
  GEMINI_MODEL: 'gemini-2.5-flash',

  // Shared staff PIN to open the app. Set '' to disable the PIN gate.
  STAFF_PIN: '1234',

  // Flag the till as off when |over/short| exceeds this many dollars.
  OVER_SHORT_TOLERANCE: 5,

  // Email an alert when postage left in the CRM drops below this.
  POSTAGE_ALERT_THRESHOLD: 200,

  // CPU compensation (Attachment 4 of the USPS contract).
  // 19.5% on weigh-in mail + special services; $0.25 per prepaid piece.
  COMMISSION_RATE: 0.195,
  PREPAID_RATE: 0.25,

  // In-house service fees (100% store revenue, not USPS).
  PASSPORT_FEE: 35,
  NOTARY_FEE: 11,
  FAX_FEE: 1.5,        // per fax page
  COPY_SMALL_FEE: 1,   // copy job of 1-3 pages
  COPY_LARGE_FEE: 3,   // copy job of 4-10 pages

  // Packing supplies sold (retail). Add/edit items here — the form and the
  // math pick them up automatically. Prices stay server-side (off the form).
  SUPPLIES: [
    { key: 'mailer_6x10',     label: '6x10 poly bubble mailer',   price: 2.00 },
    { key: 'env_9x12',        label: '9x12 white envelope',       price: 2.00 },
    { key: 'mailer_10_5x16',  label: '10.5x16 bubble mailer',     price: 3.00 },
    { key: 'mailer_12x15_5',  label: '12x15.5 poly mailer',       price: 2.00 },
    { key: 'mailer_14_25x20', label: '14.25x20 bubble mailer',    price: 4.00 },
    { key: 'box_4x4x4',       label: '4x4x4 brown box',           price: 1.50 },
    { key: 'box_6x6x6',       label: '6x6x6 brown box',           price: 2.00 },
    { key: 'box_4x10x8',      label: '4x10x8 brown box',          price: 4.00 },
    { key: 'box_18x14x12',    label: '18x14x12 brown box',        price: 6.50 },
    { key: 'box_24x18x18',    label: '24x18x18 brown box',        price: 9.50 }
  ]
};
// ===================================================================

// ---- Routing --------------------------------------------------------
function doGet(e) {
  var page = (e && e.parameter && e.parameter.page) || '';
  var file = page === 'open' ? 'opening' : (page === 'appt' ? 'appointments' : 'index');
  return HtmlService.createHtmlOutputFromFile(file)
    .setTitle('Cross Creek Pak N Ship')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

// ---- Supplies list for the form (labels only — prices stay server-side) ----
function getSupplies() {
  return CONFIG.SUPPLIES.map(function (s) { return { key: s.key, label: s.label }; });
}

// ---- Access ---------------------------------------------------------
function validatePin(pin) {
  if (!CONFIG.STAFF_PIN) return true;
  return String(pin) === String(CONFIG.STAFF_PIN);
}

// ---- Cross-page lookups ---------------------------------------------
/** Returns today's counted starting bank from "Openings", or null. */
function getOpeningBank(date) {
  var sh = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName('Openings');
  if (!sh) return null;
  var rows = sh.getDataRange().getValues();
  for (var i = rows.length - 1; i >= 1; i--) {
    if (ymd_(rows[i][1]) === date) return rows[i][3];
  }
  return null;
}

/** True if a close-out already exists for the given date. */
function closeoutExists(date) {
  var sh = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName('Closeouts');
  if (!sh) return false;
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (ymd_(rows[i][1]) === date) return true;
  }
  return false;
}

// ---- Gemini photo auto-read ----------------------------------------
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
    '- prepaidQty/prepaidValue = the "Prepaid Mail" section subtotal; 0 if none.',
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

// ---- Close-out submit ----------------------------------------------
function submitCloseout(data) {
  var ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);

  // Money math (server-authoritative)
  var startingBank = n_(data.startingBank);
  var cash = n_(data.cash);
  var pettyCash = n_(data.pettyCash);
  var drawerCounted = n_(data.drawerCounted);
  var ccTotal = n_(data.ccTotal);
  var totalSales = cash + ccTotal;
  var expected = startingBank + cash - pettyCash;
  var overShort = drawerCounted - expected;

  // CPU pay: 19.5% of weigh-in mail + special services, plus $0.25/prepaid piece
  var mailRevenue = n_(data.mailRevenue);
  var prepaidPieces = n_(data.prepaid);
  var estPay = mailRevenue * CONFIG.COMMISSION_RATE + prepaidPieces * CONFIG.PREPAID_RATE;

  // In-house service income
  var passportCount = n_(data.passportCount);
  var notaryCount = n_(data.notaryCount);
  var faxPages = n_(data.faxPages);
  var copySmall = n_(data.copySmall);
  var copyLarge = n_(data.copyLarge);
  var serviceIncome = passportCount * CONFIG.PASSPORT_FEE + notaryCount * CONFIG.NOTARY_FEE +
    faxPages * CONFIG.FAX_FEE + copySmall * CONFIG.COPY_SMALL_FEE + copyLarge * CONFIG.COPY_LARGE_FEE;

  // Packing supplies sold
  var supplies = data.supplies || {};
  var suppliesIncome = 0;
  CONFIG.SUPPLIES.forEach(function (s) { suppliesIncome += n_(supplies[s.key]) * s.price; });

  var estTotalIncome = estPay + serviceIncome + suppliesIncome;

  // Save the photo to Drive
  var photoUrl = '';
  if (data.photoData) {
    var folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
    var ext = (data.photoName && data.photoName.indexOf('.') > -1)
      ? data.photoName.substring(data.photoName.lastIndexOf('.')) : '.jpg';
    var safeCloser = (data.closedBy || 'unknown').replace(/[^\w\-]+/g, '_');
    var blob = Utilities.newBlob(
      Utilities.base64Decode(data.photoData),
      data.photoType || 'image/jpeg',
      data.date + '_category-report_' + safeCloser + ext);
    photoUrl = folder.createFile(blob).getUrl();
  }

  // Summary row
  var emps = data.employees || [];
  var sheet = getOrCreateSheet(ss, 'Closeouts', [
    'Timestamp', 'Date', 'Closed by', 'Starting bank ($)', 'Cash ($)',
    'CC payments (#)', 'CC total ($)', 'Total sales ($)', 'Petty cash out ($)',
    'Drawer counted ($)', 'Expected drawer ($)', 'Over/Short ($)',
    'Stamps used ($)', 'Postage left in CRM ($)', 'Prepaid pkgs', 'Voided pkgs',
    '# Employees', 'Report photo', 'Notes',
    'Commissionable mail ($)', 'Est. CPU pay ($)',
    'Passport renewals (#)', 'Notaries (#)', 'Service income ($)', 'Est. total income ($)',
    'Fax pages (#)', 'Copies 1-3 (#)', 'Copies 4-10 (#)', 'Supplies income ($)'
  ]);
  sheet.appendRow([
    new Date(), data.date, data.closedBy, startingBank, cash, data.ccCount,
    ccTotal, totalSales, pettyCash, drawerCounted, expected, overShort,
    n_(data.stamps), n_(data.postageLeft), data.prepaid, data.voided,
    emps.length, photoUrl, data.notes || '',
    mailRevenue, estPay,
    passportCount, notaryCount, serviceIncome, estTotalIncome,
    faxPages, copySmall, copyLarge, suppliesIncome
  ]);

  // Supplies sold — one row per item (qty > 0) in "Supplies"
  var anySupplies = CONFIG.SUPPLIES.some(function (s) { return n_(supplies[s.key]) > 0; });
  if (anySupplies) {
    var supSheet = getOrCreateSheet(ss, 'Supplies', [
      'Timestamp', 'Date', 'Item', 'Qty', 'Unit price ($)', 'Line total ($)']);
    var supTime = new Date();
    CONFIG.SUPPLIES.forEach(function (s) {
      var q = n_(supplies[s.key]);
      if (q > 0) supSheet.appendRow([supTime, data.date, s.label, q, s.price, q * s.price]);
    });
  }

  // Per-employee rows
  if (emps.length) {
    var empSheet = getOrCreateSheet(ss, 'Employees', [
      'Timestamp', 'Date', 'Employee', 'Clock in', 'Clock out',
      'Customers helped', 'Told notary', 'Told passport', 'Closed by'
    ]);
    var now = new Date();
    emps.forEach(function (e) {
      empSheet.appendRow([now, data.date, e.name, e.clockIn, e.clockOut,
        e.customers, e.notary, e.passport, data.closedBy]);
    });
  }

  // Report line items
  var rd = data.reportData;
  if (rd && rd.sections && rd.sections.length) {
    var rl = getOrCreateSheet(ss, 'Report Lines', [
      'Timestamp', 'Date', 'Section', 'CAT', 'Description', 'Qty', 'Value ($)']);
    var rlTime = new Date();
    rd.sections.forEach(function (sec) {
      (sec.lines || []).forEach(function (ln) {
        rl.appendRow([rlTime, data.date, sec.name, ln.cat, ln.description, ln.qty, ln.value]);
      });
    });
  }

  // Emails
  if (CONFIG.SEND_EMAIL && CONFIG.EMAIL_TO) {
    sendSummaryEmail(data, photoUrl, expected, overShort, totalSales, mailRevenue, estPay, serviceIncome, suppliesIncome, estTotalIncome);
  }
  if (n_(data.postageLeft) < CONFIG.POSTAGE_ALERT_THRESHOLD && CONFIG.EMAIL_TO) {
    MailApp.sendEmail(CONFIG.EMAIL_TO,
      '⚠️ LOW POSTAGE — $' + n_(data.postageLeft).toFixed(2) + ' left in CRM',
      'Postage left in the CRM is $' + n_(data.postageLeft).toFixed(2) +
      ' as of close on ' + data.date + ' (' + data.closedBy + ').\n' +
      'Threshold is $' + CONFIG.POSTAGE_ALERT_THRESHOLD + '. Reload postage soon.');
  }

  var msg = 'Close-out recorded for ' + data.date + '.';
  if (Math.abs(overShort) > CONFIG.OVER_SHORT_TOLERANCE) {
    msg += ' NOTE: drawer is ' + (overShort < 0 ? 'SHORT' : 'OVER') +
      ' by $' + Math.abs(overShort).toFixed(2) + '.';
  }
  return msg;
}

// ---- Opening submit -------------------------------------------------
function openShift(data) {
  var ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  var sh = getOrCreateSheet(ss, 'Openings', [
    'Timestamp', 'Date', 'Opened by', 'Starting bank ($)',
    'Checklist done', 'Notes']);
  sh.appendRow([new Date(), data.date, data.openedBy, n_(data.startingBank),
    (data.checklist || []).join(', '), data.notes || '']);
  return 'Opening logged for ' + data.date + '.';
}

// ---- Appointment log ------------------------------------------------
function logAppointment(data) {
  var ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  var sh = getOrCreateSheet(ss, 'Appointments', [
    'Logged', 'Service', 'Customer', 'Phone', 'Appt date', 'Appt time',
    'Booked by', 'Notes']);
  sh.appendRow([new Date(), data.service, data.customer, data.phone,
    data.apptDate, data.apptTime, data.bookedBy, data.notes || '']);
  return 'Appointment saved for ' + data.customer + '.';
}

// ---- Scheduled summaries (add time-driven triggers) -----------------
function sendWeeklySummary() { periodSummary_(7, 'Weekly'); }
function sendMonthlySummary() { periodSummary_(31, 'Monthly'); }

function periodSummary_(days, label) {
  if (!CONFIG.EMAIL_TO) return;
  var sh = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName('Closeouts');
  if (!sh) return;
  var rows = sh.getDataRange().getValues();
  var cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
  var t = { sales: 0, cash: 0, card: 0, stamps: 0, prepaid: 0, voided: 0, os: 0,
    pay: 0, passport: 0, notary: 0, svc: 0, supplies: 0, income: 0, n: 0 };
  for (var i = 1; i < rows.length; i++) {
    var d = new Date(rows[i][1]);
    if (d >= cutoff) {
      t.sales += n_(rows[i][7]); t.cash += n_(rows[i][4]); t.card += n_(rows[i][6]);
      t.stamps += n_(rows[i][12]); t.prepaid += n_(rows[i][14]); t.voided += n_(rows[i][15]);
      t.os += n_(rows[i][11]); t.pay += n_(rows[i][20]);
      t.passport += n_(rows[i][21]); t.notary += n_(rows[i][22]);
      t.svc += n_(rows[i][23]); t.income += n_(rows[i][24]); t.supplies += n_(rows[i][28]); t.n++;
    }
  }
  MailApp.sendEmail(CONFIG.EMAIL_TO, label + ' summary — ' + t.n + ' days',
    [label + ' summary (last ' + days + ' days, ' + t.n + ' close-outs):', '',
      'Total sales: $' + t.sales.toFixed(2),
      'Cash: $' + t.cash.toFixed(2) + '   Card: $' + t.card.toFixed(2),
      'Stamps/postage used: $' + t.stamps.toFixed(2),
      'Prepaid packages: ' + t.prepaid + '   Voided: ' + t.voided,
      'Net over/short: $' + t.os.toFixed(2),
      'Estimated CPU pay: $' + t.pay.toFixed(2),
      'Passport renewals: ' + t.passport + '   Notaries: ' + t.notary,
      'Service income: $' + t.svc.toFixed(2),
      'Supplies income: $' + t.supplies.toFixed(2),
      'ESTIMATED TOTAL INCOME: $' + t.income.toFixed(2)].join('\n'));
}

// ---- One-time analytics tab builder ---------------------------------
function buildDashboard() {
  var ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  var d = ss.getSheetByName('Dashboard') || ss.insertSheet('Dashboard');
  d.clear();
  var mStart = 'EOMONTH(TODAY(),-1)+1', mEnd = 'EOMONTH(TODAY(),0)';
  function monthSum(col) {
    return '=SUMIFS(Closeouts!' + col + ':' + col + ',Closeouts!B:B,">="&' +
      mStart + ',Closeouts!B:B,"<="&' + mEnd + ')';
  }
  d.getRange('A1').setValue('Cross Creek Pak N Ship — Dashboard').setFontSize(14).setFontWeight('bold');
  d.getRange('A2').setValue('Current-month KPIs (Employee & category sections are all-time)');

  var kpis = [
    ['Total sales', monthSum('H')], ['Cash', monthSum('E')], ['Card', monthSum('G')],
    ['Stamps/postage used', monthSum('M')], ['Prepaid packages', monthSum('O')],
    ['Voided packages', monthSum('P')], ['Net over/short', monthSum('L')],
    ['Commissionable mail', monthSum('T')], ['Est. CPU pay', monthSum('U')],
    ['Passport renewals', monthSum('V')], ['Notaries', monthSum('W')],
    ['Fax pages', monthSum('Z')], ['Copies 1-3', monthSum('AA')], ['Copies 4-10', monthSum('AB')],
    ['Service income', monthSum('X')], ['Supplies income', monthSum('AC')],
    ['Est. TOTAL income', monthSum('Y')]
  ];
  d.getRange('A4').setValue('Metric').setFontWeight('bold');
  d.getRange('B4').setValue('This month').setFontWeight('bold');
  for (var i = 0; i < kpis.length; i++) {
    d.getRange(5 + i, 1).setValue(kpis[i][0]);
    d.getRange(5 + i, 2).setFormula(kpis[i][1]);
  }
  var r = 5 + kpis.length + 2; // running row, with a gap after the KPI block

  d.getRange(r, 1).setValue('Per-employee upsell (all-time)').setFontWeight('bold');
  d.getRange(r + 1, 1).setFormula(
    "=QUERY(Employees!A2:I,\"select C, sum(F), sum(G), sum(H) where C is not null group by C label C 'Employee', sum(F) 'Customers', sum(G) 'Told notary', sum(H) 'Told passport'\",0)");
  r += 15;
  d.getRange(r, 1).setValue('Category mix by section (all-time)').setFontWeight('bold');
  d.getRange(r + 1, 1).setFormula(
    "=QUERY('Report Lines'!A2:G,\"select C, sum(F), sum(G) where C is not null group by C label C 'Section', sum(F) 'Qty', sum(G) 'Value'\",0)");
  r += 15;
  d.getRange(r, 1).setValue('Top 10 category codes by value (all-time)').setFontWeight('bold');
  d.getRange(r + 1, 1).setFormula(
    "=QUERY('Report Lines'!A2:G,\"select D, sum(G), sum(F) where D is not null group by D order by sum(G) desc limit 10 label D 'CAT', sum(G) 'Value', sum(F) 'Qty'\",0)");
  r += 14;
  d.getRange(r, 1).setValue('Supplies sold (all-time)').setFontWeight('bold');
  d.getRange(r + 1, 1).setFormula(
    "=QUERY(Supplies!A2:F,\"select C, sum(D), sum(F) where C is not null group by C order by sum(F) desc label C 'Item', sum(D) 'Qty', sum(F) 'Revenue'\",0)");
  d.setColumnWidth(1, 240); d.setColumnWidth(2, 140);
  return 'Dashboard built.';
}

// ---- Email body for daily close-out ---------------------------------
function sendSummaryEmail(data, photoUrl, expected, overShort, totalSales, mailRevenue, estPay, serviceIncome, suppliesIncome, estTotalIncome) {
  var lines = [
    'Cross Creek Pak N Ship — End-of-Day Close-Out', '',
    'Date: ' + data.date, 'Closed by: ' + data.closedBy, '',
    'Starting bank: $' + n_(data.startingBank).toFixed(2),
    'Cash collected: $' + n_(data.cash).toFixed(2),
    'Credit card payments: ' + data.ccCount + ' (total $' + n_(data.ccTotal).toFixed(2) + ')',
    'Total sales: $' + n_(totalSales).toFixed(2),
    'Petty cash out: $' + n_(data.pettyCash).toFixed(2),
    'Drawer counted: $' + n_(data.drawerCounted).toFixed(2),
    'Expected drawer: $' + n_(expected).toFixed(2),
    'Over/Short: $' + n_(overShort).toFixed(2) +
      (Math.abs(overShort) > CONFIG.OVER_SHORT_TOLERANCE ? '  <-- CHECK' : ''),
    '',
    'Stamps/postage used: $' + n_(data.stamps).toFixed(2),
    'Postage left in CRM: $' + n_(data.postageLeft).toFixed(2),
    'Prepaid packages: ' + data.prepaid, 'Voided packages: ' + data.voided, '',
    'Commissionable mail (weigh-in + special): $' + n_(mailRevenue).toFixed(2),
    'Estimated CPU pay (19.5% mail + $' + CONFIG.PREPAID_RATE + '/prepaid): $' + n_(estPay).toFixed(2),
    'Passport renewals: ' + (data.passportCount || 0) + ' (x$' + CONFIG.PASSPORT_FEE + ')',
    'Notaries: ' + (data.notaryCount || 0) + ' (x$' + CONFIG.NOTARY_FEE + ')',
    'Fax pages: ' + (data.faxPages || 0) + ' (x$' + CONFIG.FAX_FEE + ')',
    'Copies 1-3 pp: ' + (data.copySmall || 0) + ' (x$' + CONFIG.COPY_SMALL_FEE + ')   ' +
      'Copies 4-10 pp: ' + (data.copyLarge || 0) + ' (x$' + CONFIG.COPY_LARGE_FEE + ')',
    'Service income: $' + n_(serviceIncome).toFixed(2),
    'Supplies income: $' + n_(suppliesIncome).toFixed(2),
    'ESTIMATED TOTAL INCOME: $' + n_(estTotalIncome).toFixed(2),
    '',
    'Report photo: ' + (photoUrl || '(none)'),
    'Notes: ' + (data.notes || '(none)'), '', 'Employees:'
  ];
  (data.employees || []).forEach(function (e) {
    lines.push('  • ' + e.name + ' | in ' + (e.clockIn || '-') + ' out ' + (e.clockOut || '-') +
      ' | customers ' + e.customers + ' | notary ' + e.notary + ' | passport ' + e.passport);
  });
  if (!(data.employees || []).length) lines.push('  (none entered)');
  MailApp.sendEmail(CONFIG.EMAIL_TO,
    'Close-Out ' + data.date + ' — ' + data.closedBy +
      (Math.abs(overShort) > CONFIG.OVER_SHORT_TOLERANCE ? ' (OVER/SHORT)' : ''),
    lines.join('\n'));
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
function n_(v) { var x = parseFloat(v); return isNaN(x) ? 0 : x; }
function ymd_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(v).slice(0, 10);
}
