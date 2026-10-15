# schedule-adjustment

自然文で日程調整を作り、確定したら Google カレンダー登録・招待・Meet 発行までまとめて行う、自分用のツールです。設計は [docs/design.md](docs/design.md) を参照してください。

## 開発

```bash
npm install
cp .env.example .env.local   # 値を埋める（下記）
npm run dev
```

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー（http://localhost:3000） |
| `npm test` | ユニットテスト（vitest） |
| `npm run typecheck` | 型チェック |
| `npm run lint` | ESLint |
| `npm run build` | 本番ビルド |

## 初回セットアップ

### 1. Supabase

1. プロジェクトを作成する
2. SQL Editor で `supabase/migrations/0001_init.sql` を実行する
3. Project URL を `SUPABASE_URL`、シークレットキーを `SUPABASE_SECRET_KEY` に入れる（サーバー専用。ブラウザに出さない）

### 2. Google Cloud（OAuth）

1. プロジェクトを作成し、Google Calendar API を有効にする
2. OAuth 同意画面（Google Auth Platform）を作成する
   - ユーザーの種類: 外部（Gmail と Workspace の両方でログインするため）
   - スコープ: `calendar.events` と `calendar.freebusy`
   - 公開ステータス: 「本番環境」にする。「テスト」のままだとリフレッシュトークンが7日で失効し、毎週ログインし直しになります。未審査のため、ログイン時に「確認されていないアプリ」の警告が出ます（自分用なので続行して問題ありません）
3. 認証情報で「OAuth クライアント ID（ウェブアプリケーション）」を作成する
   - 承認済みのリダイレクト URI: `http://localhost:3000/api/auth/google/callback` と、本番の `https://<ドメイン>/api/auth/google/callback`
4. クライアント ID とシークレットを `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` に入れる

Workspace 側で外部アプリの利用が制限されている場合は、管理者に許可してもらう必要があります。

### 3. その他の環境変数

```bash
openssl rand -base64 48   # SESSION_SECRET
openssl rand -base64 32   # TOKEN_ENCRYPTION_KEY
```

`OWNER_EMAILS` には、ログインを許可する自分の Google アカウントをカンマ区切りで入れます。

### 4. Vercel

リポジトリを Vercel にインポートし、上記の環境変数を設定します。`APP_URL` は本番の URL にします。
