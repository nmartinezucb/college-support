/**
 * College Support ticketing backend (Google Apps Script).
 *
 * Paste this into the spreadsheet's Apps Script editor
 * (Extensions > Apps Script), then Deploy > New deployment > Web app:
 *   Execute as: Me    Who has access: Anyone
 * Copy the /exec URL into SCRIPT_URL at the top of index.html.
 *
 * Sheet layout (rows 1-2 are headers, tickets start on row 3):
 *   A Time Created | B Name | C Support Type | D Requesting support to
 *   E Location     | F Ticket Status (adviser dropdown) | G Notes
 */

const SHEET_NAME = 'Sheet1';
const FIRST_DATA_ROW = 3;
const STATUS_COLUMN = 6; // F

// Column F dropdown values.
const DEFAULT_STATUS = 'Waiting for help';
// These statuses go in the right-hand "Completed" column; everything else stays on the left.
const CLOSED_STATUSES = ['Completed', 'Cancelled'];

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function clean_(value, maxLength) {
  return String(value == null ? '' : value).trim().slice(0, maxLength);
}

/** First empty row at or below row 3, judged by column A (Time Created). */
function nextRow_(sheet) {
  const last = Math.max(sheet.getLastRow(), FIRST_DATA_ROW - 1);
  if (last < FIRST_DATA_ROW) return FIRST_DATA_ROW;
  const times = sheet.getRange(FIRST_DATA_ROW, 1, last - FIRST_DATA_ROW + 1, 1).getValues();
  for (let i = times.length - 1; i >= 0; i--) {
    if (times[i][0] !== '') return FIRST_DATA_ROW + i + 1;
  }
  return FIRST_DATA_ROW;
}

/** Form submission: writes one ticket into columns A-E and sets F to "Waiting for help". */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const name = clean_(data.name, 100);
    const supportType = clean_(data.supportType, 100);
    const adviser = clean_(data.adviser, 100);
    const location = clean_(data.location, 100);
    if (!name || !supportType || !adviser) {
      return json_({ ok: false, error: 'Name, support type and adviser are required.' });
    }

    const sheet = getSheet_();
    const row = nextRow_(sheet);
    sheet.getRange(row, 1, 1, 6).setValues([[new Date(), name, supportType, adviser, location, DEFAULT_STATUS]]);
    return json_({ ok: true, row: row });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** Status board: returns every ticket with its status from column F. */
function doGet() {
  const sheet = getSheet_();
  const last = sheet.getLastRow();
  if (last < FIRST_DATA_ROW) return json_({ ok: true, tickets: [] });

  const rows = sheet.getRange(FIRST_DATA_ROW, 1, last - FIRST_DATA_ROW + 1, STATUS_COLUMN).getValues();
  const tickets = [];
  rows.forEach(function (r, i) {
    if (r[0] === '' && r[1] === '') return; // skip empty rows
    const status = String(r[5] || '').trim();
    tickets.push({
      id: FIRST_DATA_ROW + i,
      created: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
      name: publicName_(r[1]),
      supportType: String(r[2]),
      adviser: String(r[3]),
      location: String(r[4]),
      status: status || DEFAULT_STATUS,
      completed: CLOSED_STATUSES.some(function (c) { return c.toLowerCase() === status.toLowerCase(); })
    });
  });
  return json_({ ok: true, tickets: tickets });
}

/** Board is public, so show first name + last initial only ("Maria G."). */
function publicName_(full) {
  const parts = String(full).trim().split(/\s+/);
  if (parts.length < 2) return parts[0] || '';
  return parts[0] + ' ' + parts[parts.length - 1].charAt(0).toUpperCase() + '.';
}
