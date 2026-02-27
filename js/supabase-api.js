// ============================================================
// テレアポ顧客管理システム - Supabase API ラッパー
// ============================================================

const SUPABASE_URL = 'https://ruyiqlgqzjotrcxxlprt.supabase.co';

let _sb = null;

// Supabaseクライアント初期化（ページ読み込み時に呼ぶ）
function initSupabase() {
  const key = localStorage.getItem('supabaseAnonKey');
  if (!key) return false;
  _sb = supabase.createClient(SUPABASE_URL, key);
  return true;
}

function getClient() {
  if (!_sb) initSupabase();
  if (!_sb) throw new Error('Supabaseのキーが設定されていません。設定画面でキーを入力してください。');
  return _sb;
}

// ── スネークケース ↔ キャメルケース 変換 ──
function rowToCustomer(row) {
  return {
    id:           String(row.id || ''),
    businessId:   String(row.business_id || ''),
    companyName:  String(row.company_name || ''),
    contactName:  String(row.contact_name || ''),
    department:   String(row.department || ''),
    phone:        String(row.phone || ''),
    email:        String(row.email || ''),
    address:      String(row.address || ''),
    tags:         String(row.tags || ''),
    callCount:    Number(row.call_count) || 0,
    lastCallDate: row.last_call_date || '',
    notes:        String(row.notes || ''),
    createdAt:    row.created_at || '',
    updatedAt:    row.updated_at || '',
  };
}

function rowToCallRecord(row) {
  return {
    id:         String(row.id || ''),
    customerId: String(row.customer_id || ''),
    callDate:   row.call_date || '',
    result:     String(row.result || ''),
    duration:   String(row.duration || ''),
    operator:   String(row.operator || ''),
    memo:       String(row.memo || ''),
  };
}

// ════════════════════════════════════════
// 接続テスト
// ════════════════════════════════════════
async function apiPing() {
  const sb = getClient();
  const { error } = await sb.from('app_settings').select('key').limit(1);
  if (error) throw new Error(error.message);
  return { status: 'ok', success: true };
}

// ════════════════════════════════════════
// 顧客操作
// ════════════════════════════════════════
async function apiGetCustomers(businessId) {
  const sb = getClient();
  let query = sb.from('customers').select('*').order('updated_at', { ascending: false });
  if (businessId) query = query.eq('business_id', businessId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return { customers: data.map(rowToCustomer) };
}

async function apiGetCustomer(id) {
  const sb = getClient();
  const [{ data: cData, error: cErr }, { data: hData, error: hErr }] = await Promise.all([
    sb.from('customers').select('*').eq('id', id).single(),
    sb.from('call_history').select('*').eq('customer_id', id).order('call_date', { ascending: false })
  ]);
  if (cErr) throw new Error(cErr.message);
  return {
    customer:    rowToCustomer(cData),
    callHistory: (hData || []).map(rowToCallRecord)
  };
}

async function apiAddCustomer(payload) {
  const sb = getClient();
  const { data, error } = await sb.from('customers').insert({
    business_id:  payload.businessId   || '',
    company_name: payload.companyName  || '',
    contact_name: payload.contactName  || '',
    department:   payload.department   || '',
    phone:        payload.phone        || '',
    email:        payload.email        || '',
    address:      payload.address      || '',
    tags:         payload.tags         || '',
    call_count:   0,
    notes:        payload.notes        || '',
  }).select('id').single();
  if (error) throw new Error(error.message);
  return { success: true, id: data.id };
}

async function apiUpdateCustomer(payload) {
  const sb = getClient();
  const updates = {};
  if (payload.companyName  !== undefined) updates.company_name  = payload.companyName;
  if (payload.contactName  !== undefined) updates.contact_name  = payload.contactName;
  if (payload.department   !== undefined) updates.department    = payload.department;
  if (payload.phone        !== undefined) updates.phone         = payload.phone;
  if (payload.email        !== undefined) updates.email         = payload.email;
  if (payload.address      !== undefined) updates.address       = payload.address;
  if (payload.tags         !== undefined) updates.tags          = payload.tags;
  if (payload.notes        !== undefined) updates.notes         = payload.notes;
  const { error } = await sb.from('customers').update(updates).eq('id', payload.id);
  if (error) throw new Error(error.message);
  return { success: true };
}

async function apiDeleteCustomer(id) {
  const sb = getClient();
  const { error } = await sb.from('customers').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
}

async function apiUpdateCustomerTags(customerId, tags) {
  const sb = getClient();
  const { error } = await sb.from('customers').update({ tags }).eq('id', customerId);
  if (error) throw new Error(error.message);
  return { success: true };
}

// ════════════════════════════════════════
// 架電履歴操作
// ════════════════════════════════════════
async function apiAddCallRecord(payload) {
  const sb = getClient();

  // 架電履歴を追加
  const { data, error } = await sb.from('call_history').insert({
    customer_id: payload.customerId,
    call_date:   payload.callDate || new Date().toISOString(),
    result:      payload.result   || '',
    duration:    payload.duration || '',
    operator:    payload.operator || '',
    memo:        payload.memo     || '',
  }).select('id').single();
  if (error) throw new Error(error.message);

  // 架電回数・最終架電日を更新
  const { data: cur } = await sb.from('customers').select('call_count').eq('id', payload.customerId).single();
  const newCount = ((cur?.call_count) || 0) + 1;
  await sb.from('customers').update({
    call_count:     newCount,
    last_call_date: payload.callDate || new Date().toISOString(),
  }).eq('id', payload.customerId);

  // タグも更新（指定がある場合）
  if (payload.tags !== undefined) {
    await apiUpdateCustomerTags(payload.customerId, payload.tags);
  }

  return { success: true, id: data.id };
}

// ════════════════════════════════════════
// 一括インポート
// ════════════════════════════════════════
async function apiBulkImport(customers) {
  const sb = getClient();
  const rows = customers
    .filter(c => c.companyName && c.phone)
    .map(c => ({
      business_id:  c.businessId   || '',
      company_name: c.companyName  || '',
      contact_name: c.contactName  || '',
      department:   c.department   || '',
      phone:        c.phone        || '',
      email:        c.email        || '',
      address:      c.address      || '',
      tags:         c.tags         || '',
      notes:        c.notes        || '',
      call_count:   0,
    }));
  if (rows.length === 0) throw new Error('インポートデータがありません');
  const { error } = await sb.from('customers').insert(rows);
  if (error) throw new Error(error.message);
  return { success: true, imported: rows.length };
}

// ════════════════════════════════════════
// 設定操作
// ════════════════════════════════════════
async function apiGetSettings() {
  const sb = getClient();
  const { data, error } = await sb.from('app_settings').select('*');
  if (error) throw new Error(error.message);
  const settings = {};
  for (const row of (data || [])) {
    settings[row.key] = row.value;
  }
  return { settings };
}

async function apiSaveSettings(key, value) {
  const sb = getClient();
  const { error } = await sb.from('app_settings').upsert({ key, value }, { onConflict: 'key' });
  if (error) throw new Error(error.message);
  return { success: true };
}

// ════════════════════════════════════════
// 設定をlocalStorageと同期
// ════════════════════════════════════════
async function syncSettingsFromSupabase() {
  try {
    const { settings } = await apiGetSettings();
    if (settings.businesses)            localStorage.setItem('businesses',            JSON.stringify(settings.businesses));
    if (settings.operators)             localStorage.setItem('operators',             JSON.stringify(settings.operators));
    if (settings.customerTagsByBusiness) localStorage.setItem('customerTagsByBusiness', JSON.stringify(settings.customerTagsByBusiness));
    if (settings.users)                 localStorage.setItem('users',                 JSON.stringify(settings.users));
  } catch(e) {}
}

async function syncSettingToSupabase(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  try { await apiSaveSettings(key, value); } catch(e) {}
}
