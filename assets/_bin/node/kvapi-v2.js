/** ========= CONFIG ========= **/
const SHEET_NAME = 'KeyValue';
const HEADERS = ['key','value','createdAt'];

/** ========= SETUP ========= **/
/** Exécuter une fois pour créer la feuille et l’en-tête */
function setup() { getSheet_(); }

/** ========= UTILS ========= **/
function getSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    // Force en texte pour éviter les conversions automatiques
    sh.getRange('A:C').setNumberFormat('@STRING@');
  }
  return sh;
}

function respond_(payload, mime) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(mime || ContentService.MimeType.JSON);
}

// Répond 200 aux preflights éventuels (Apps Script ne permet pas d’ajouter des headers personnalisés ici)
function doOptions(e) {
  return ContentService.createTextOutput('').setMimeType(ContentService.MimeType.TEXT);
}

function findRowByKey_(sh, key) {
  const values = sh.getDataRange().getValues(); // inclut l’en-tête
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === key) return i + 1; // index 1-based dans la feuille
  }
  return 0;
}

function parseBody_(e) {
  try {
    if (e && e.postData) {
      const type = (e.postData.type || '').toLowerCase();
      // application/json
      if (type.indexOf('application/json') !== -1 && e.postData.contents) {
        return JSON.parse(e.postData.contents);
      }
    }
    // x-www-form-urlencoded / querystring -> e.parameter
    const p = (e && e.parameter) ? e.parameter : {};
    if (p.data) {
      // Support data=JSON encodé
      return JSON.parse(decodeURIComponent(p.data));
    }
    return { key: p.key, value: p.value };
  } catch (err) {
    return {};
  }
}

/** ========= API ========= **/
function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const action = (params.action || '').toLowerCase();
  const sh = getSheet_();

  if (action === 'get_all') {
    const lastRow = sh.getLastRow();
    if (lastRow < 2) return respond_({ ok: true, items: [] });
    const values = sh.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
    const items = values.map(r => ({
      key: String(r[0]),
      value: r[1],
      createdAt: String(r[2]),
    }));
    return respond_({ ok: true, count: items.length, items });
  }

  if (action === 'get') {
    const key = params.key ? String(params.key).trim() : '';
    if (!key) return respond_({ ok: false, error: 'Missing "key" parameter' });
    const row = findRowByKey_(sh, key);
    if (!row) return respond_({ ok: false, error: 'Not found', key });
    const val = sh.getRange(row, 2).getValue();
    const ts = sh.getRange(row, 3).getValue();
    return respond_({ ok: true, item: { key, value: val, createdAt: String(ts) } });
  }

  // Aide rapide
  return respond_({
    ok: true,
    usage: {
      get: 'GET ?action=get&key=YOUR_KEY',
      get_all: 'GET ?action=get_all',
      add_or_update: 'POST key=YOUR_KEY&value=YOUR_VALUE'
    }
  });
}

function doPost(e) {
  const body = parseBody_(e);
  const key = typeof body.key === 'string' ? body.key.trim() : '';
  const value = (body.value !== undefined && body.value !== null) ? body.value : '';

  if (!key) return respond_({ ok: false, error: 'Missing "key"' });

  const sh = getSheet_();
  let row = findRowByKey_(sh, key);

  if (row) {
    // Mise à jour: garder createdAt de la première insertion
    sh.getRange(row, 2).setValue(value);
    const createdAt = sh.getRange(row, 3).getValue();
    return respond_({ ok: true, updated: true, item: { key, value, createdAt: String(createdAt) } });
  } else {
    const createdAt = new Date().toISOString();
    sh.appendRow([key, value, createdAt]);
    return respond_({ ok: true, created: true, item: { key, value, createdAt } });
  }
}

/** ========= TESTS (remplacer WEBAPP_URL) ========= **/
const WEBAPP_URL = 'https://script.google.com/macros/s/XXXXXXXXXXXX/exec';

/** Test: ajoute une clé/valeur (POST x-www-form-urlencoded) */
function test_add_kv() {
  const key = 'test_' + new Date().toISOString().replace(/[:.]/g, '-');
  const value = 'hello world';
  const payload = 'key=' + encodeURIComponent(key) + '&value=' + encodeURIComponent(value);

  const res = UrlFetchApp.fetch(WEBAPP_URL, {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    payload,
    muteHttpExceptions: true
  });

  Logger.log('POST status: %s', res.getResponseCode());
  Logger.log(res.getContentText());
  return res.getContentText();
}

/** Test: récupère toutes les clés/valeurs (GET ?action=get_all) */
function test_get_all() {
  const url = WEBAPP_URL + '?action=get_all';
  const res = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true });

  Logger.log('GET status: %s', res.getResponseCode());
  Logger.log(res.getContentText());
  return res.getContentText();
}
