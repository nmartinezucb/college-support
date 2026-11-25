/**
 * College Support ticketing backend (Google Apps Script).
 *
 * Paste this into the spreadsheet's Apps Script editor
 * (Extensions > Apps Script), then Deploy > New deployment > Web app:
 *   Execute as: Me    Who has access: Anyone
 * Copy the /exec URL into SCRIPT_URL at the top of index.html.
 *
 * Sheet layout (rows 1-2 are headers, tickets start on row 3):
 *   A Time Created | B Name | C Support Type | D Requesting support to (Mr. Martinez and/or Ms. Alanna)
 *   E Location     | F Completed (time, filled in automatically) | G Ticket Status (adviser dropdown)
 *   H Notes
 *
 * Column F is stamped by onEdit() below whenever an adviser sets column G to
 * "Completed". onEdit is a "simple trigger": it runs on its own once this code
 * is saved in the sheet's Apps Script editor, with no trigger setup needed.
 */

const SHEET_NAME = 'Sheet1';
const FIRST_DATA_ROW = 3;
const COMPLETED_COLUMN = 6; // F
const STATUS_COLUMN = 7;    // G

// Column G dropdown values.
const DEFAULT_STATUS = 'Waiting for help';
// These statuses go in the right-hand "Completed" column; everything else stays on the left.
const CLOSED_STATUSES = ['Completed', 'Cancelled'];
// Setting column G to this status stamps the time in column F.
const COMPLETED_STATUS = 'Completed';

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

/** Form submission: writes one ticket into columns A-E and sets G to "Waiting for help". */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const name = clean_(data.name, 100);
    const supportType = clean_(data.supportType, 300);
    const adviser = clean_(data.adviser, 100);
    const location = clean_(data.location, 100);
    if (!name || !supportType || !adviser) {
      return json_({ ok: false, error: 'Name, support type and adviser are required.' });
    }

    const sheet = getSheet_();
    const row = nextRow_(sheet);
    sheet.getRange(row, 1, 1, 5).setValues([[new Date(), name, supportType, adviser, location]]);
    sheet.getRange(row, STATUS_COLUMN).setValue(DEFAULT_STATUS);
    return json_({ ok: true, row: row });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** Status board: returns every ticket with its status (G) and completed time (F). */
function doGet() {
  const sheet = getSheet_();
  const last = sheet.getLastRow();
  if (last < FIRST_DATA_ROW) return json_({ ok: true, tickets: [] });

  const rows = sheet.getRange(FIRST_DATA_ROW, 1, last - FIRST_DATA_ROW + 1, STATUS_COLUMN).getValues();
  const tickets = [];
  rows.forEach(function (r, i) {
    if (r[0] === '' && r[1] === '') return; // skip empty rows
    const status = String(r[STATUS_COLUMN - 1] || '').trim();
    tickets.push({
      id: FIRST_DATA_ROW + i,
      created: toIso_(r[0]),
      completedAt: toIso_(r[COMPLETED_COLUMN - 1]),
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

function toIso_(value) {
  if (value instanceof Date) return value.toISOString();
  return String(value || '');
}

/**
 * Runs automatically whenever someone edits the sheet by hand.
 * Status (G) set to "Completed": stamps the current time in F (if F is empty).
 * Status changed away from "Completed": clears F so it can be stamped again.
 */
function onEdit(e) {
  const range = e && e.range;
  if (!range) return;
  const sheet = range.getSheet();
  if (sheet.getName() !== getSheet_().getName()) return;

  // Ignore edits that don't touch column G below the headers.
  const firstCol = range.getColumn();
  const lastCol = firstCol + range.getNumColumns() - 1;
  if (STATUS_COLUMN < firstCol || STATUS_COLUMN > lastCol) return;
  const firstRow = Math.max(range.getRow(), FIRST_DATA_ROW);
  const lastRow = range.getRow() + range.getNumRows() - 1;
  if (lastRow < firstRow) return;

  // Handles one cell or a pasted block of several rows.
  const count = lastRow - firstRow + 1;
  const statuses = sheet.getRange(firstRow, STATUS_COLUMN, count, 1).getValues();
  const stampsRange = sheet.getRange(firstRow, COMPLETED_COLUMN, count, 1);
  const stamps = stampsRange.getValues();
  const now = new Date();
  let changed = false;
  for (let i = 0; i < count; i++) {
    const isCompleted = String(statuses[i][0]).trim().toLowerCase() === COMPLETED_STATUS.toLowerCase();
    if (isCompleted && stamps[i][0] === '') {
      stamps[i][0] = now;
      changed = true;
    } else if (!isCompleted && stamps[i][0] !== '') {
      stamps[i][0] = '';
      changed = true;
    }
  }
  if (changed) stampsRange.setValues(stamps);
}

/** Board is public, so show first name + last initial only ("Maria G."). */
function publicName_(full) {
  const parts = String(full).trim().split(/\s+/);
  if (parts.length < 2) return parts[0] || '';
  return parts[0] + ' ' + parts[parts.length - 1].charAt(0).toUpperCase() + '.';
}
