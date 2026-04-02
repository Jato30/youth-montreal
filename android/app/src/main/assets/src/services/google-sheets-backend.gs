/**
 * Youth Montreal Host Finder - Backend Workspace
 * Resource mapping: 'churches' -> 'hosts'
 */

const CONFIG = {
  SHEET_NAME_HOSTS: 'hosts',
  SHEET_NAME_SUGGESTIONS: 'suggestions',
  SHEET_NAME_HOST_REQUESTS: 'hostRequests'
};

/**
 * Run this once in Apps Script editor to initialize sheets.
 */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  [CONFIG.SHEET_NAME_HOSTS, CONFIG.SHEET_NAME_SUGGESTIONS, CONFIG.SHEET_NAME_HOST_REQUESTS].forEach(name => {
    if (!ss.getSheetByName(name)) {
      const sheet = ss.insertSheet(name);
      sheet.appendRow(['data_json']);
    }
  });
}

function doGet(e) {
  const resource = e.parameter.resource;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(resource);

  if (!sheet) return createResponse({ error: 'Resource not found' });

  const values = sheet.getDataRange().getValues();
  const data = values.length > 1 ? JSON.parse(values[1][0]) : [];

  const result = {};
  result[resource] = data;
  return createResponse(result);
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const resource = body.resource;
    const payload = body.payload; // Supports nested arrays like host.events

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(resource);
    if (!sheet) {
      sheet = ss.insertSheet(resource);
      sheet.appendRow(['data_json']);
    }

    // Overwrite row 2 with the latest JSON state
    sheet.getRange(2, 1).setValue(JSON.stringify(payload));
    return createResponse({ success: true, resource: resource });
  } catch (err) {
    return createResponse({ error: err.toString() });
  }
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
