const SHEET_NAME = 'records';
const HEADERS = ['timestamp', 'height', 'weight', 'bodyFat', 'muscleMass', 'visceralFat'];

function doGet(e) {
  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  values.shift(); // drop header row
  const records = values
    .filter(row => row[0] !== '')
    .map(row => {
      const obj = {};
      HEADERS.forEach((h, i) => {
        const v = row[i];
        obj[h] = v instanceof Date ? v.toISOString() : v;
      });
      return obj;
    });
  return jsonResponse(records);
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  const sheet = getSheet();

  if (body.action === 'delete') {
    removeRecord(sheet, body.timestamp);
    return jsonResponse({ result: 'deleted' });
  }

  sheet.appendRow([
    body.timestamp,
    Number(body.height),
    Number(body.weight),
    Number(body.bodyFat),
    Number(body.muscleMass),
    Number(body.visceralFat)
  ]);
  return jsonResponse({ result: 'created' });
}

function removeRecord(sheet, timestamp) {
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(timestamp)) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
  }
  return sheet;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
