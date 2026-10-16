# 実装状況と機能認識

確認日: 2026-10-16  
確認対象: `main` の現行ソース（この文書作成時点）。  
この文書はコードから読み取れる実装状況の要約です。外部サービスの稼働、Vercel設定、Google Cloud設定、本番データの状態は確認していません。

## CCが作業前に読むこと

- `docs/design.md` は目標仕様であり、実装済み機能の保証ではない。
- この一覧はコードの実装有無を記録する。実際に動くことの確認とは区別する。
- 機能を変更する前に、該当ページ、Server Action、`src/lib`、DB migration と既存テストを読む。
- 設計とコードに差がある場合、ここを黙って書き換えて仕様を確定させず、判断が必要な箇所をProduct Ownerへ報告する。

## 現行コードで確認できる機能

| 機能 | 現状 | 主な根拠 |
|---|---|---|
| 作成者ログイン | Google OAuth。初回ログイン時にユーザーを作成し、Googleアカウントをユーザーに紐付ける。 | `src/app/api/auth/google/`, `src/lib/accounts.ts` |
| Googleアカウント連携 | ログイン後に別アカウントを追加連携できる。トークンは暗号化して保存する。 | `src/app/settings/page.tsx`, `src/lib/accounts.ts`, `src/lib/crypto.ts` |
| 調整作成 | タイトル、所要時間、Meet有無、候補開始日時をフォームで入力する。候補は日本時間。 | `src/app/events/new/`, `src/lib/validation.ts` |
| 共有と回答 | 推測されにくいIDのURLを共有する。回答者はログイン不要。名前は必須、メール・コメントは任意。候補ごとに○△×をすべて選んで送信する。 | `src/app/e/[id]/`, `src/lib/events.ts`, `src/lib/validation.ts` |
| 回答一覧 | 候補ごとの○△×数と回答者名を表示し、○が最多の候補を強調する。 | `src/app/events/_results.tsx` |
| 日程確定 | 作成者が候補を選び、メインのGoogleアカウントのカレンダーに予定を作る。設定に応じてMeet URLを発行し、メール入力済み回答者を招待する。 | `src/app/events/[id]/`, `src/app/events/actions.ts`, `src/lib/calendar-api.ts` |
| 確定後の案内 | 共有ページに確定日時を表示し、Googleカレンダー追加リンクとICSを提供する。 | `src/app/e/[id]/page.tsx`, `src/app/e/[id]/calendar.ics/` |
| DB所有者分離 | 作成者ごとに調整一覧を絞り、所有者でない作成者からの取得を制限する実装がある。 | `db/migrations/0002_multi_user.sql`, `src/lib/events.ts` |

## 設計にはあるが、現行コードで実装を確認できない機能

| 目標機能 | 現状 |
|---|---|
| 自然文から候補日時・タイトル・所要時間を作る | 実装なし。現在の作成画面は手入力。 |
| Google Calendar freeBusy で空き時間を取得し候補に反映する | OAuth scope は要求しているが、freeBusy 呼び出しは確認できない。 |
| 自然文の回答を○△×に変換する | 実装なし。現在は候補ごとの選択式。 |
| Gemini API連携 | 現行の依存関係・アプリコードに呼び出しを確認できない。 |
| PWA（ホーム画面追加に必要なmanifest等） | 現行ファイル一覧で実装を確認できない。 |
| AI利用のユーザー別・日別回数制限 | 実装を確認できない。 |
| 候補確認画面での自然文生成結果の編集 | 現在は手入力フォームで候補を編集する。 |

未実装機能に着手する場合、まずProduct Ownerが優先順位と具体的な受入条件を決め、設計と脅威・プライバシー要件を更新する。

## 仕様の未決事項・説明の不一致

1. `docs/design.md` は個人用・一般公開しない方針を示す一方、現行コードは初回のGoogleログインで作成者ユーザーを作れる。これは「公開デプロイか」と「作成者を誰に許可するか」を分けてProduct Ownerが決める必要がある。CCは勝手に一方へ寄せない。
2. 設計書は空き時間照合を目標にする一方、作成画面は候補日時の手入力であり、freeBusy呼び出しは見当たらない。
3. `src/app/privacy/page.tsx` はAI入力をGeminiへ送る説明を含むが、現行アプリコードでGemini呼び出しは確認できない。AI機能を実装する場合は、データの送信先・入力内容・利用条件を確認してからプライバシー表示を更新する。法的な表現を独断で変更しない。
4. `package.json` の `build` は `next build` の前に常に `scripts/migrate.mjs` を実行する。一方、READMEの環境説明はPreviewでは実行しないと記載していた。Vercelの実際のBuild設定や接続先は未確認。Buildを実行する前にDB接続先を確認し、環境ごとのMigration実行方針は別途判断する。

## 開発時の実行コマンド

`package.json` が定義する主なコマンド:

- `npm run dev`: Next.js開発サーバー
- `npm test`: Vitest
- `npm run typecheck`: Next.js typegen と TypeScript
- `npm run lint`: ESLint
- `npm run build`: Migration後に本番ビルド（接続先DBに注意）
- `npm run db:migrate`: `.env.local` の `DATABASE_URL` を使ってMigration

この文書作成時にコマンドやテストは実行していない。
