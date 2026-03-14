-- tel_standalone_questions テーブル作成
CREATE TABLE IF NOT EXISTS tel_standalone_questions (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  business_id TEXT NOT NULL,
  question    TEXT NOT NULL,
  answer      TEXT DEFAULT '',
  answered_by TEXT DEFAULT '',
  answered_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  created_by  TEXT DEFAULT ''
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_standalone_questions_business_id ON tel_standalone_questions(business_id);
CREATE INDEX IF NOT EXISTS idx_standalone_questions_created_at  ON tel_standalone_questions(created_at DESC);
