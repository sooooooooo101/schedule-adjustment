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
| 回答一覧 | 候補ごとの○△×数と回答者名を表示し、○が最多の候補を強調する。回答編集・削除は未実装。 | `src/app/events/_results.tsx` |
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
| 回答者のGoogleログイン・本人の回答編集削除 | 未実装。現状の回答ページはログイン不要。目標仕様は主催者・回答者ともメールアドレスによるアプリ内認証必須で、回答はアプリ内ユーザーIDに紐付ける。 |
| メール認証と任意連携の分離 | 未実装。現行のGoogle OAuthログインとCalendar権限を切り離し、アプリ内認証を先に成立させる必要がある。Calendar/Slackは後付けの任意連携とする。 |

未実装機能に着手する場合、まずProduct Ownerが優先順位と具体的な受入条件を決め、設計と脅威・プライバシー要件を更新する。タイムライン、メール認証必須の回答、本人による編集・削除の目標仕様は [機能仕様](features/tonton-style-scheduling/SPEC.md) を参照。候補上限30件、メール認証によるユーザー識別、匿名旧回答の削除はProduct Owner確認済み。メール認証方式と外部連携方針の具体仕様は未決。

## 仕様の決定事項・未確認事項

- **利用者認証の方向性は決定済み:** Googleアカウントでログインできる人は誰でも作成者・回答者になれる目標。回答者はGoogle認証必須。学校Workspaceアカウントを含むが、管理者が第三者アプリを禁止している場合は管理者の許可が必要。現行実装は回答者ログインを要求しないため未対応。
- **デプロイとOAuth設定は未確認:** Vercel公開状態、Google OAuth Audience (External)、Publishing status (In production)、verification状況、OAuth Client ID、学校Workspace側の許可状態は未確認。Google CloudのAudience/公開状態をExternal/In productionにしても、各学校Workspaceの管理ポリシーは越えられない。
- 設計書は空き時間照合を目標にする一方、作成画面は候補日時の手入力であり、freeBusy呼び出しは見当たらない。
- `src/app/privacy/page.tsx` はAI入力をGeminiへ送る説明を含むが、現行アプリコードでGemini呼び出しは確認できない。AI機能を実装する場合は、データの送信先・入力内容・利用条件を確認してからプライバシー表示を更新する。法的な表現を独断で変更しない。
- `package.json` の `build` は `next build` の前に常に `scripts/migrate.mjs` を実行する。Vercelの実際のBuild設定や接続先は未確認。Buildを実行する前にDB接続先を確認し、環境ごとのMigration実行方針は別途判断する。

## 開発時の実行コマンド

`package.json` が定義する主なコマンド:

- `npm run dev`: Next.js開発サーバー
- `npm test`: Vitest
- `npm run typecheck`: Next.js typegen と TypeScript
- `npm run lint`: ESLint
- `npm run build`: Migration後に本番ビルド（接続先DBに注意）
- `npm run db:migrate`: `.env.local` の `DATABASE_URL` を使ってMigration

この文書作成時にコマンドやテストは実行していない。


## TONTONを参考にした機能の比較

Product Ownerの方針: TONTONのような日程調整機能を踏襲する。以下は公式トップページと操作ガイドで確認できた範囲の比較であり、画面や内部実装を複製する仕様ではない。確認日: 2026-10-16。

公式資料: [TONTONトップページ](https://tonton.amaneku.com/) / [TONTON操作ガイド](https://tonton.amaneku.com/guide.html)

| TONTONで確認できた機能 | 現行アプリとの比較 |
|---|---|
| 主催者が基本情報と複数の日付・時間帯を選び、登録すると共有URLを発行 | **一部対応。** 現行アプリも候補日時を複数入力してURLを発行できるが、候補を日付と時間帯のタイムラインで選ぶUI、一括選択はない。候補ごとに日時を手入力する。 |
| 参加者がニックネーム、削除用パスワード、任意コメントを入力し、時間帯に利用マークを付ける | **一部対応。** 現行アプリは名前・任意メール・任意コメントと候補ごとの○△×回答を受け付ける。自分の回答を編集・削除する機能や、削除用パスワードはない。 |
| 主催者が回答を見て決定日時を登録し、参加者へ別途連絡 | **対応・拡張。** 現行アプリは回答を集計して候補を確定できる。確定時にGoogleカレンダーへ登録し、メールアドレスのある回答者を招待し、Meetも発行できる。 |
| 参加者への催促は主催者がメール等で行う | **方針は一致。** TONTON公式トップページは催促を主催者自身が行うと説明。現行アプリにも自動リマインドはない。 |

### CCが機能変更時に守ること

- 候補URL共有・回答集計・主催者による日程確定を保つ。回答者はProduct Owner決定によりGoogleログイン必須とするため、TONTON型のログイン不要回答とは異なる。
- 時間帯のタイムライン入力、一括候補設定、回答編集・削除は未実装。30分刻み、および回答登録パスワードによる編集・削除はProduct Owner確認済み。詳細仕様と実装前ブロッカーは [機能仕様](features/tonton-style-scheduling/SPEC.md) を参照。
- 回答管理では、サーバーで検証したGoogleユーザーIDを回答所有者として使う。回答者のidentity-only OAuthと作成者のCalendar scopesを分離する。新方式導入時に匿名旧回答・answersを削除する（Product Owner承認済み）。実装前に新しいOAuth/認可モデルをAntigravityが独立監査する。
- 自然文入力、Googleカレンダー空き時間照合、Googleカレンダー確定登録・Meet・招待は、このアプリ固有の拡張としてTONTONの標準機能と混同しない。
- TONTON自体を操作・自動回答する連携は対象外。TONTONに似たユーザー向け機能をこのアプリ内に実装する。
