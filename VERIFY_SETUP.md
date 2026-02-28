# テレアポ顧客管理システム - 環境・接続の完全確認手順

**このファイルを Cursor に貼り付けて「この指示に従って確認してください」と送信すると、会社パソコンと自宅パソコンの状態が一致しているか確認できます。**

---

## 📋 実行してほしいこと

1. **このドキュメントの指示に従い、以下をすべて確認・実行してください**
2. **結果を一覧で報告してください**（OK / NG / 要対応）
3. **NG や要対応があれば、修正内容を提示してください**

---

## ① プロジェクトファイルの存在確認

以下のファイルがすべて存在するか確認してください。存在しない場合は「要作成」と報告してください。

| 必須ファイル | 説明 |
|-------------|------|
| `index.html` | トップページ（業務一覧） |
| `customers.html` | 顧客一覧 |
| `detail.html` | 顧客詳細・架電記録 |
| `settings.html` | 設定画面 |
| `import.html` | 一括インポート |
| `login.html` | ログイン画面 |
| `call.html` | 架電専用ページ |
| `dashboard.html` | ダッシュボード（全体/個人/業務） |
| `js/supabase-api.js` | Supabase API ラッパー |
| `supabase-schema.sql` | DB 初期テーブル定義 |
| `supabase-migration.sql` | archived 列追加マイグレーション |

---

## ② 必須コードの含有確認

次のコード断片が各ファイルに含まれているか検索してください。含まれていなければ「見つかりません」と報告してください。

### js/supabase-api.js
- `SUPABASE_URL` が `https://ruyiqlgqzjotrcxxlprt.supabase.co` である
- `apiAddCustomer` 関数が存在する
- `apiArchiveCustomer` 関数が存在する
- `apiGetDashboardData` 関数が存在する
- `getUserAllowedBusinesses` 関数が存在する

### login.html
- `doLogin()` 関数が存在する
- ボタンに `onclick="doLogin()"` が含まれる

### customers.html
- `doAddCustomer()` 関数が存在する
- `apiCheckDuplicates` を呼び出している
- `toggleArchiveView` が存在する
- `tagFilterMode` が存在する（OR/AND）

### index.html
- `deleteBusiness` が `apiArchiveByBusiness` を呼んでいる
- `getVisibleBusinesses` が存在する

---

## ③ GitHub 接続の確認

以下を実行し、結果を報告してください。

```bash
cd "テレアポ顧客管理システムのフォルダパス"
git status
git remote -v
git log -1 --oneline
```

**期待する状態:**
- `git status`: `nothing to commit, working tree clean` または 変更内容が表示される
- `git remote -v`: `origin` が `https://github.com/nanairo-systems/teleapo-kanri.git` を指している
- `git log`: 最新のコミットが表示される（例: `def215a` 以降）

**GitHub にまだ接続していない場合の設定コマンド:**

```bash
cd "プロジェクトフォルダのパス"
git init
git remote add origin https://github.com/nanairo-systems/teleapo-kanri.git
git fetch origin
git branch -M main
git reset --hard origin/main
```

---

## ④ Supabase（データベース）接続の確認

### 4-1 公開URL

以下が正しく設定されているか確認してください。

| 項目 | 期待値 |
|------|--------|
| Supabase URL | `https://ruyiqlgqzjotrcxxlprt.supabase.co` |
| 公開APIキー | `sb_publishable_uBtc7mr7El_WnoTMe3GkEQ_nzqfSZd9`（js/supabase-api.js 内） |

※ 秘密鍵（service_role）はコードに絶対に書かないこと。

### 4-2 データベーステーブルの存在確認

Supabase 管理画面（https://supabase.com）にログインし、以下を確認してください。

| テーブル | 必須列 |
|---------|--------|
| `customers` | id, business_id, company_name, phone, archived, archived_at |
| `call_history` | id, customer_id, call_date, result, operator |
| `app_settings` | key, value |

**`archived` 列がない場合:**
Supabase の SQL Editor で `supabase-migration.sql` の内容を実行してください。

```sql
ALTER TABLE customers ADD COLUMN IF NOT EXISTS archived    BOOLEAN     DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_customers_archived ON customers(archived);
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON customers    TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON call_history TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON app_settings TO anon, authenticated;
```

### 4-3 動作確認用URL

ブラウザで以下にアクセスし、接続できることを確認してください。

**本番URL:**  
https://nanairo-systems.github.io/teleapo-kanri/

**確認手順:**
1. ログイン画面が表示される
2. ID: `admin` / パスワード: `admin123` でログインできる
3. 設定 → 接続テスト → 「✅ 接続OK」が表示される

---

## ⑤ 自宅PCと会社PCの状態比較

会社PCで以下のコマンドを実行し、自宅PCと同じか確認してください。

```bash
cd "プロジェクトフォルダのパス"
git fetch origin
git status
git diff origin/main --stat
```

**期待する状態:**
- `git status`: `Your branch is up to date with 'origin/main'`
- `git diff origin/main --stat`: 差分なし（空）

**差分がある場合:**
- 自宅の変更を反映したい: `git pull origin main`
- 会社の変更を破棄したい: `git reset --hard origin/main`

---

## ⑥ 新規PCで初回セットアップする場合の完全手順

### Step 1: リポジトリのクローン
```bash
git clone https://github.com/nanairo-systems/teleapo-kanri.git
cd teleapo-kanri
```

### Step 2: ローカルで確認
- `index.html` をブラウザで開いても、GitHub Pages のURLとは表示が異なる場合があります
- 本番動作確認は必ず https://nanairo-systems.github.io/teleapo-kanri/ で行ってください

### Step 3: Supabase マイグレーション
- Supabase 管理画面 → SQL Editor
- `supabase-migration.sql` の内容を貼り付けて実行（まだ実行していない場合のみ）

### Step 4: 動作確認
- https://nanairo-systems.github.io/teleapo-kanri/ を開く
- ログイン → 設定 → 接続テスト
- 顧客追加 → 架電記録 → ダッシュボード を試す

---

## ⑦ 確認結果の報告フォーマット

Cursor に貼り付けたあと、以下の形式で結果を報告してもらってください。

```
【① ファイル存在】 OK / NG（不足: xxx）
【② 必須コード】 OK / NG（不足: xxx）
【③ GitHub接続】 OK / NG（理由: xxx）
【④ Supabase接続】 OK / NG（理由: xxx）
【⑤ 状態比較】 同期済 / 差分あり（内容: xxx）
【⑥ 本番URL動作】 OK / NG
```

---

## 変更を GitHub に反映するときのコマンド

```bash
cd "プロジェクトフォルダのパス"
git add -A
git status
git commit -m "変更内容の説明"
git push origin main
```

 push 後、数分以内に https://nanairo-systems.github.io/teleapo-kanri/ に反映されます。
