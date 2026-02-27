-- ============================================================
-- テレアポ顧客管理システム - Supabase スキーマ
-- Supabase管理画面の「SQL Editor」でこのSQLをすべて実行してください
-- ============================================================

-- ── 既存テーブルを削除（やり直し用） ──
DROP TABLE IF EXISTS call_history CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS app_settings CASCADE;

-- ── 顧客マスタ ──
CREATE TABLE customers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   TEXT NOT NULL DEFAULT '',
  company_name  TEXT NOT NULL DEFAULT '',
  contact_name  TEXT DEFAULT '',
  department    TEXT DEFAULT '',
  phone         TEXT DEFAULT '',
  email         TEXT DEFAULT '',
  address       TEXT DEFAULT '',
  tags          TEXT DEFAULT '',
  call_count    INTEGER DEFAULT 0,
  last_call_date TIMESTAMPTZ,
  notes         TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 架電履歴 ──
CREATE TABLE call_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  call_date   TIMESTAMPTZ DEFAULT NOW(),
  result      TEXT DEFAULT '',
  duration    TEXT DEFAULT '',
  operator    TEXT DEFAULT '',
  memo        TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── アプリ設定（業務・対応者・タグ・ユーザー等） ──
CREATE TABLE app_settings (
  key   TEXT PRIMARY KEY,
  value JSONB
);

-- ── RLS（Row Level Security）をオフ ──
-- ※ フロントエンドで独自ログイン認証を使用しているため
ALTER TABLE customers    DISABLE ROW LEVEL SECURITY;
ALTER TABLE call_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;

-- ── インデックス（検索の高速化） ──
CREATE INDEX idx_customers_business_id  ON customers(business_id);
CREATE INDEX idx_customers_updated_at   ON customers(updated_at DESC);
CREATE INDEX idx_call_history_customer_id ON call_history(customer_id);

-- ── updated_at 自動更新トリガー ──
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON customers;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
