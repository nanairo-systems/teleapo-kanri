// ============================================================
// テレアポ顧客管理システム - Supabase API ラッパー v2
// ============================================================

const SUPABASE_URL      = 'https://ruyiqlgqzjotrcxxlprt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_uBtc7mr7El_WnoTMe3GkEQ_nzqfSZd9';

let _sb;
try {
  _sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('[Supabase] クライアント初期化OK');
} catch(e) {
  console.error('[Supabase] クライアント初期化失敗:', e);
}

function _ensureClient() {
  if (!_sb) throw new Error('Supabaseクライアントが初期化されていません');
}

// ── 変換ヘルパー ──
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
    archived:     !!row.archived,
    archivedAt:   row.archived_at || '',
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
  _ensureClient();
  const { error } = await _sb.from('app_settings').select('key').limit(1);
  if (error) throw new Error(error.message);
  return { status: 'ok', success: true };
}

// ════════════════════════════════════════
// 顧客操作
// ════════════════════════════════════════
async function apiGetCustomers(businessId, includeArchived) {
  _ensureClient();
  let query = _sb.from('customers').select('*').order('updated_at', { ascending: false });
  if (businessId) query = query.eq('business_id', businessId);
  if (!includeArchived) query = query.eq('archived', false);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return { customers: (data || []).map(rowToCustomer) };
}

async function apiGetArchivedCustomers(businessId) {
  _ensureClient();
  let query = _sb.from('customers').select('*').eq('archived', true).order('archived_at', { ascending: false });
  if (businessId) query = query.eq('business_id', businessId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return { customers: (data || []).map(rowToCustomer) };
}

async function apiGetCustomer(id) {
  _ensureClient();
  const [{ data: cData, error: cErr }, { data: hData }] = await Promise.all([
    _sb.from('customers').select('*').eq('id', id).single(),
    _sb.from('call_history').select('*').eq('customer_id', id).order('call_date', { ascending: false })
  ]);
  if (cErr) throw new Error(cErr.message);
  return {
    customer:    rowToCustomer(cData),
    callHistory: (hData || []).map(rowToCallRecord)
  };
}

async function apiAddCustomer(payload) {
  _ensureClient();
  const { error } = await _sb.from('customers').insert({
    business_id:  payload.businessId  || '',
    company_name: payload.companyName || '',
    contact_name: payload.contactName || '',
    department:   payload.department  || '',
    phone:        payload.phone       || '',
    email:        payload.email       || '',
    address:      payload.address     || '',
    tags:         payload.tags        || '',
    call_count:   0,
    notes:        payload.notes       || '',
    archived:     false,
  });
  if (error) throw new Error(`[${error.code}] ${error.message}`);
  return { success: true };
}

async function apiUpdateCustomer(payload) {
  _ensureClient();
  const updates = {};
  if (payload.companyName !== undefined) updates.company_name = payload.companyName;
  if (payload.contactName !== undefined) updates.contact_name = payload.contactName;
  if (payload.department  !== undefined) updates.department   = payload.department;
  if (payload.phone       !== undefined) updates.phone        = payload.phone;
  if (payload.email       !== undefined) updates.email        = payload.email;
  if (payload.address     !== undefined) updates.address      = payload.address;
  if (payload.tags        !== undefined) updates.tags         = payload.tags;
  if (payload.notes       !== undefined) updates.notes        = payload.notes;
  const { error } = await _sb.from('customers').update(updates).eq('id', payload.id);
  if (error) throw new Error(error.message);
  return { success: true };
}

async function apiDeleteCustomer(id) {
  _ensureClient();
  const { error } = await _sb.from('customers').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
}

async function apiUpdateCustomerTags(customerId, tags) {
  _ensureClient();
  const { error } = await _sb.from('customers').update({ tags }).eq('id', customerId);
  if (error) throw new Error(error.message);
  return { success: true };
}

// ════════════════════════════════════════
// アーカイブ操作
// ════════════════════════════════════════
async function apiArchiveCustomer(id) {
  _ensureClient();
  const { error } = await _sb.from('customers').update({
    archived: true,
    archived_at: new Date().toISOString()
  }).eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
}

async function apiRestoreCustomer(id) {
  _ensureClient();
  const { error } = await _sb.from('customers').update({
    archived: false,
    archived_at: null
  }).eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
}

async function apiArchiveByBusiness(businessId) {
  _ensureClient();
  const { error } = await _sb.from('customers')
    .update({ archived: true, archived_at: new Date().toISOString() })
    .eq('business_id', businessId)
    .eq('archived', false);
  if (error) throw new Error(error.message);
  return { success: true };
}

// ════════════════════════════════════════
// 重複チェック
// ════════════════════════════════════════
async function apiCheckDuplicates(companyName, phone, businessId) {
  _ensureClient();
  const results = { sameBusinessDups: [], otherBusinessDups: [] };

  let query = _sb.from('customers').select('id,business_id,company_name,phone,contact_name,tags,call_count,last_call_date,archived')
    .eq('archived', false);

  const { data, error } = await query;
  if (error || !data) return results;

  const normalPhone = (phone || '').replace(/[-\s]/g, '');

  for (const row of data) {
    const rowPhone = (row.phone || '').replace(/[-\s]/g, '');
    const nameMatch = companyName && row.company_name && row.company_name === companyName;
    const phoneMatch = normalPhone && rowPhone && rowPhone === normalPhone;
    if (!nameMatch && !phoneMatch) continue;

    const dup = {
      id:           row.id,
      businessId:   row.business_id,
      companyName:  row.company_name,
      phone:        row.phone,
      contactName:  row.contact_name,
      callCount:    row.call_count || 0,
      lastCallDate: row.last_call_date || '',
      matchType:    nameMatch && phoneMatch ? '会社名+電話' : nameMatch ? '会社名' : '電話番号',
    };

    if (row.business_id === businessId) results.sameBusinessDups.push(dup);
    else results.otherBusinessDups.push(dup);
  }
  return results;
}

async function apiGetCrossBusinessDuplicates(companyName, phone, excludeId) {
  _ensureClient();
  const dups = [];
  const normalPhone = (phone || '').replace(/[-\s]/g, '');
  if (!companyName && !normalPhone) return dups;

  const { data } = await _sb.from('customers').select('id,business_id,company_name,phone,contact_name,call_count,last_call_date,tags')
    .eq('archived', false).neq('id', excludeId);
  if (!data) return dups;

  for (const row of data) {
    const rowPhone = (row.phone || '').replace(/[-\s]/g, '');
    if ((companyName && row.company_name === companyName) || (normalPhone && rowPhone === normalPhone)) {
      dups.push(rowToCustomer(row));
    }
  }
  return dups;
}

// ════════════════════════════════════════
// 架電履歴操作
// ════════════════════════════════════════
async function apiAddCallRecord(payload) {
  _ensureClient();
  const { error } = await _sb.from('call_history').insert({
    customer_id: payload.customerId,
    call_date:   payload.callDate || new Date().toISOString(),
    result:      payload.result   || '',
    duration:    payload.duration || '',
    operator:    payload.operator || '',
    memo:        payload.memo     || '',
  });
  if (error) throw new Error(error.message || JSON.stringify(error));

  const { data: cur } = await _sb.from('customers').select('call_count').eq('id', payload.customerId).single();
  await _sb.from('customers').update({
    call_count:     ((cur?.call_count) || 0) + 1,
    last_call_date: payload.callDate || new Date().toISOString(),
  }).eq('id', payload.customerId);

  if (payload.tags !== undefined) {
    await apiUpdateCustomerTags(payload.customerId, payload.tags);
  }
  return { success: true };
}

async function apiGetAllCallHistory(filters) {
  _ensureClient();
  let query = _sb.from('call_history').select('*').order('call_date', { ascending: false });
  if (filters?.from) query = query.gte('call_date', filters.from);
  if (filters?.to)   query = query.lte('call_date', filters.to);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []).map(rowToCallRecord);
}

// ════════════════════════════════════════
// 一括インポート
// ════════════════════════════════════════
async function apiBulkImport(customers) {
  _ensureClient();
  const rows = customers
    .filter(c => c.companyName && c.phone)
    .map(c => ({
      business_id:  c.businessId  || '',
      company_name: c.companyName || '',
      contact_name: c.contactName || '',
      department:   c.department  || '',
      phone:        c.phone       || '',
      email:        c.email       || '',
      address:      c.address     || '',
      tags:         c.tags        || '',
      notes:        c.notes       || '',
      call_count:   0,
      archived:     false,
    }));
  if (rows.length === 0) throw new Error('インポートデータがありません');
  const { error } = await _sb.from('customers').insert(rows);
  if (error) throw new Error(error.message);
  return { success: true, imported: rows.length };
}

// ════════════════════════════════════════
// 設定操作
// ════════════════════════════════════════
async function apiGetSettings() {
  _ensureClient();
  const { data, error } = await _sb.from('app_settings').select('*');
  if (error) throw new Error(error.message);
  const settings = {};
  for (const row of (data || [])) settings[row.key] = row.value;
  return { settings };
}

async function apiSaveSettings(key, value) {
  _ensureClient();
  const { error } = await _sb.from('app_settings').upsert({ key, value }, { onConflict: 'key' });
  if (error) throw new Error(error.message);
  return { success: true };
}

async function syncSettingsFromSupabase() {
  try {
    const { settings } = await apiGetSettings();
    if (settings.businesses)             localStorage.setItem('businesses',             JSON.stringify(settings.businesses));
    if (settings.operators)              localStorage.setItem('operators',              JSON.stringify(settings.operators));
    if (settings.customerTagsByBusiness) localStorage.setItem('customerTagsByBusiness', JSON.stringify(settings.customerTagsByBusiness));
    if (settings.users)                  localStorage.setItem('users',                  JSON.stringify(settings.users));
  } catch(e) { console.warn('Supabase設定同期エラー:', e.message); }
}

async function syncSettingToSupabase(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  try { await apiSaveSettings(key, value); } catch(e) { console.warn('Supabase保存エラー:', e.message); }
}

// ════════════════════════════════════════
// 権限ヘルパー
// ════════════════════════════════════════
function getCurrentUser() {
  return JSON.parse(localStorage.getItem('authSession') || 'null');
}
function getUserAllowedBusinesses() {
  const auth = getCurrentUser();
  if (!auth) return [];
  if (auth.role === 'admin') return null;
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const user = users.find(u => u.id === auth.userId);
  return user?.allowedBusinesses || [];
}
function canAccessBusiness(businessId) {
  const allowed = getUserAllowedBusinesses();
  if (allowed === null) return true;
  return allowed.length === 0 || allowed.includes(businessId);
}

// ════════════════════════════════════════
// ダッシュボード集計
// ════════════════════════════════════════
async function apiGetDashboardData(dateFrom, dateTo) {
  _ensureClient();
  const [customersRes, callsRes] = await Promise.all([
    apiGetCustomers(null, false),
    apiGetAllCallHistory({ from: dateFrom, to: dateTo })
  ]);

  const customers = customersRes.customers;
  const calls = callsRes;
  const operators = JSON.parse(localStorage.getItem('operators') || '[]');
  const businesses = JSON.parse(localStorage.getItem('businesses') || '[]');

  return { customers, calls, operators, businesses };
}
