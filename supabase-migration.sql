-- ============================================================
-- テレアポ顧客管理 マイグレーション v2
-- Supabase SQL Editor で実行してください
-- ============================================================

-- ── 顧客テーブルにアーカイブ列追加 ──
ALTER TABLE customers ADD COLUMN IF NOT EXISTS archived    BOOLEAN     DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- ── インデックス追加 ──
CREATE INDEX IF NOT EXISTS idx_customers_archived ON customers(archived);

-- ── 権限確認（念のため再付与） ──
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON customers    TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON call_history TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON app_settings TO anon, authenticated;
