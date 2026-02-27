/**
 * テレアポ顧客管理システム - Google Apps Script バックエンド
 *
 * 【シート構成】
 * シート1: 「顧客マスタ」
 *   列: ID | 業務ID | 会社名 | 担当者名 | 部署役職 | 電話番号 | メール | 住所 | タグ | 架電回数 | 最終架電日 | 備考 | 登録日 | 更新日
 *
 * シート2: 「架電履歴」
 *   列: ID | 顧客ID | 架電日時 | (旧結果) | 通話時間 | 対応者 | メモ
 */

const CUSTOMER_SHEET = '顧客マスタ';
const CALL_SHEET = '架電履歴';
const SETTINGS_SHEET = '設定';

function doGet(e) {
  const action = e.parameter.action;
  let result;
  try {
    switch (action) {
      case 'ping':
        result = { status: 'ok', success: true, timestamp: new Date().toISOString() };
        break;
      case 'getCustomers':
        result = getCustomers(e.parameter.businessId);
        break;
      case 'getCustomer':
        result = getCustomer(e.parameter.id);
        break;
      case 'getSettings':
        result = getSettings();
        break;
      default:
        result = { error: '不明なアクション: ' + action };
    }
  } catch (err) {
    result = { error: err.message };
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let result;
  try {
    const payload = JSON.parse(e.postData.contents);
    switch (payload.action) {
      case 'addCustomer':
        result = addCustomer(payload);
        break;
      case 'updateCustomer':
        result = updateCustomer(payload);
        break;
      case 'deleteCustomer':
        result = deleteCustomer(payload.id);
        break;
      case 'addCallRecord':
        result = addCallRecord(payload);
        break;
      case 'updateCustomerTags':
        result = updateCustomerTags(payload);
        break;
      case 'bulkImport':
        result = bulkImport(payload);
        break;
      case 'saveSettings':
        result = saveSettings(payload);
        break;
      default:
        result = { error: '不明なアクション: ' + payload.action };
    }
  } catch (err) {
    result = { error: err.message };
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

// ── 顧客一覧取得（業務IDでフィルタ可能） ──
function getCustomers(businessId) {
  const sheet = getOrCreateSheet(CUSTOMER_SHEET);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { customers: [] };

  const customers = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    const c = rowToCustomer(row);
    if (!businessId || c.businessId === businessId) {
      customers.push(c);
    }
  }
  return { customers };
}

// ── 顧客詳細取得 ──
function getCustomer(id) {
  if (!id) throw new Error('IDが指定されていません');
  const sheet = getOrCreateSheet(CUSTOMER_SHEET);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      const customer = rowToCustomer(data[i]);
      const callHistory = getCallHistory(id);
      return { customer, callHistory };
    }
  }
  throw new Error('顧客が見つかりません: ' + id);
}

// ── 顧客登録 ──
function addCustomer(payload) {
  const sheet = getOrCreateSheet(CUSTOMER_SHEET);
  const id = generateId();
  const now = new Date().toISOString();

  sheet.appendRow([
    id,
    payload.businessId || '',
    payload.companyName || '',
    payload.contactName || '',
    payload.department || '',
    payload.phone || '',
    payload.email || '',
    payload.address || '',
    payload.tags || '',
    0,
    '',
    payload.notes || '',
    now,
    now
  ]);
  return { success: true, id };
}

// ── 顧客更新 ──
function updateCustomer(payload) {
  if (!payload.id) throw new Error('IDが指定されていません');
  const sheet = getOrCreateSheet(CUSTOMER_SHEET);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(payload.id)) {
      const row = i + 1;
      const now = new Date().toISOString();
      // 列: ID(1) | 業務ID(2) | 会社名(3) | 担当者名(4) | 部署(5) | 電話(6) | メール(7) | 住所(8) | タグ(9) | 架電回数(10) | 最終架電日(11) | 備考(12) | 登録日(13) | 更新日(14)
      sheet.getRange(row, 3).setValue(payload.companyName || data[i][2]);
      sheet.getRange(row, 4).setValue(payload.contactName !== undefined ? payload.contactName : data[i][3]);
      sheet.getRange(row, 5).setValue(payload.department !== undefined ? payload.department : data[i][4]);
      sheet.getRange(row, 6).setValue(payload.phone || data[i][5]);
      sheet.getRange(row, 7).setValue(payload.email !== undefined ? payload.email : data[i][6]);
      sheet.getRange(row, 8).setValue(payload.address !== undefined ? payload.address : data[i][7]);
      if (payload.tags !== undefined) sheet.getRange(row, 9).setValue(payload.tags);
      sheet.getRange(row, 12).setValue(payload.notes !== undefined ? payload.notes : data[i][11]);
      sheet.getRange(row, 14).setValue(now);
      return { success: true };
    }
  }
  throw new Error('顧客が見つかりません: ' + payload.id);
}

// ── 顧客タグ更新 ──
function updateCustomerTags(payload) {
  if (!payload.customerId) throw new Error('顧客IDが指定されていません');
  const sheet = getOrCreateSheet(CUSTOMER_SHEET);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(payload.customerId)) {
      const row = i + 1;
      sheet.getRange(row, 9).setValue(payload.tags || '');
      sheet.getRange(row, 14).setValue(new Date().toISOString());
      return { success: true };
    }
  }
  throw new Error('顧客が見つかりません: ' + payload.customerId);
}

// ── 顧客削除 ──
function deleteCustomer(id) {
  if (!id) throw new Error('IDが指定されていません');
  const sheet = getOrCreateSheet(CUSTOMER_SHEET);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      deleteCallRecords(id);
      return { success: true };
    }
  }
  throw new Error('顧客が見つかりません: ' + id);
}

// ── 架電履歴登録 ──
function addCallRecord(payload) {
  if (!payload.customerId) throw new Error('顧客IDが指定されていません');
  const callSheet = getOrCreateSheet(CALL_SHEET);
  const callId = generateId();

  callSheet.appendRow([
    callId,
    payload.customerId,
    payload.callDate || new Date().toISOString(),
    payload.result || '',
    payload.duration || '',
    payload.operator || '',
    payload.memo || ''
  ]);

  updateCustomerCallStats(payload.customerId, payload.callDate);

  if (payload.tags !== undefined) {
    updateCustomerTags({ customerId: payload.customerId, tags: payload.tags });
  }

  return { success: true, id: callId };
}

// ── 架電履歴取得 ──
function getCallHistory(customerId) {
  const sheet = getOrCreateSheet(CALL_SHEET);
  const data = sheet.getDataRange().getValues();
  const records = [];

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(customerId)) {
      records.push({
        id: data[i][0],
        customerId: data[i][1],
        callDate: formatDateValue(data[i][2]),
        result: data[i][3],
        duration: data[i][4],
        operator: data[i][5],
        memo: data[i][6]
      });
    }
  }
  return records;
}

// ── 架電後の顧客マスタ更新（架電回数・最終架電日のみ） ──
function updateCustomerCallStats(customerId, callDate) {
  const sheet = getOrCreateSheet(CUSTOMER_SHEET);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(customerId)) {
      const row = i + 1;
      const currentCount = Number(data[i][9]) || 0;
      const now = new Date().toISOString();

      sheet.getRange(row, 10).setValue(currentCount + 1);
      sheet.getRange(row, 11).setValue(callDate || now);
      sheet.getRange(row, 14).setValue(now);
      break;
    }
  }
}

// ── 架電履歴全削除 ──
function deleteCallRecords(customerId) {
  const sheet = getOrCreateSheet(CALL_SHEET);
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][1]) === String(customerId)) {
      sheet.deleteRow(i + 1);
    }
  }
}

// ── 一括インポート ──
function bulkImport(payload) {
  const customers = payload.customers;
  if (!customers || !Array.isArray(customers) || customers.length === 0) {
    throw new Error('インポートデータがありません');
  }

  const sheet = getOrCreateSheet(CUSTOMER_SHEET);
  const now = new Date().toISOString();
  const rows = [];

  for (const c of customers) {
    if (!c.companyName || !c.phone) continue;
    rows.push([
      generateId(),
      c.businessId || '',
      c.companyName || '',
      c.contactName || '',
      c.department || '',
      c.phone || '',
      c.email || '',
      c.address || '',
      c.tags || '',
      0,
      '',
      c.notes || '',
      now,
      now
    ]);
  }

  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 14).setValues(rows);
  }

  return { success: true, imported: rows.length };
}

// ── 設定の取得・保存 ──
function getSettings() {
  const sheet = getOrCreateSheet(SETTINGS_SHEET);
  const data = sheet.getDataRange().getValues();
  const settings = {};
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      try { settings[data[i][0]] = JSON.parse(data[i][1]); }
      catch(e) { settings[data[i][0]] = data[i][1]; }
    }
  }
  return { settings };
}

function saveSettings(payload) {
  if (!payload.key) throw new Error('キーが指定されていません');
  const sheet = getOrCreateSheet(SETTINGS_SHEET);
  const data = sheet.getDataRange().getValues();
  const jsonValue = JSON.stringify(payload.value);

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(payload.key)) {
      sheet.getRange(i + 1, 2).setValue(jsonValue);
      return { success: true };
    }
  }
  sheet.appendRow([payload.key, jsonValue]);
  return { success: true };
}

// ── ヘルパー ──
function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (name === CUSTOMER_SHEET) {
      sheet.appendRow(['ID', '業務ID', '会社名', '担当者名', '部署役職', '電話番号', 'メール', '住所', 'タグ', '架電回数', '最終架電日', '備考', '登録日', '更新日']);
      sheet.getRange(1, 1, 1, 14).setFontWeight('bold').setBackground('#f3f4f6');
      sheet.setFrozenRows(1);
    } else if (name === CALL_SHEET) {
      sheet.appendRow(['ID', '顧客ID', '架電日時', '', '通話時間', '対応者', 'メモ']);
      sheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#f3f4f6');
      sheet.setFrozenRows(1);
    } else if (name === SETTINGS_SHEET) {
      sheet.appendRow(['キー', '値']);
      sheet.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#f3f4f6');
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

function rowToCustomer(row) {
  return {
    id: String(row[0] || ''),
    businessId: String(row[1] || ''),
    companyName: String(row[2] || ''),
    contactName: String(row[3] || ''),
    department: String(row[4] || ''),
    phone: String(row[5] || ''),
    email: String(row[6] || ''),
    address: String(row[7] || ''),
    tags: String(row[8] || ''),
    callCount: Number(row[9]) || 0,
    lastCallDate: formatDateValue(row[10]),
    notes: row[11],
    createdAt: formatDateValue(row[12]),
    updatedAt: formatDateValue(row[13])
  };
}

function formatDateValue(val) {
  if (!val) return '';
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

function generateId() {
  return Utilities.getUuid();
}
