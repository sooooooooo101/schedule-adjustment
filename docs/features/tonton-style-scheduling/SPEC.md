# TONTON型候補タイムラインと回答管理 仕様（ドラフト）

状態: Product Owner確認済みの要件を反映。OAuth設定は未確認、実装前レビュー待ち  
更新日: 2026-10-16

## 1. 目的

候補日時を日付ごとの時間帯タイムラインから作り、複数日に一括適用できるようにする。回答者はGoogleアカウントでログインし、本人の回答を編集・削除できる。

TONTONの画面や内部実装を複製せず、このアプリのイベント・候補・回答の流れに統合する。

## 2. 決定済み要件

- 候補タイムラインは30分刻み、イベントあたりの候補上限は30件。
- 同じ時間範囲を複数の選択日に一括適用できる。
- 回答の作成・編集・削除にはGoogleログインを必須にする。学校のGoogle Workspaceアカウントも対象にする。
- パスワードを回答管理に使わない。Google認証済みユーザーは自分の回答を編集・削除できる。
- Google Workspace管理者がアプリをブロックしている場合、利用者やアプリ側でその管理ポリシーを回避しない。管理者に許可を依頼する。
- 現在の匿名回答は、新方式の導入時に削除してよい（Product Owner承認済み）。イベント自体は削除しない。
- TONTON自体の自動操作・連携はしない。

## 3. 機能要件

### 3.1 主催者: 日付・候補時間の設定

1. イベント作成フォームで複数日を追加・削除する。
2. 各日について、30分刻みのタイムラインから時間範囲を選ぶ。
3. 選択した複数日に同じ範囲を一括適用し、その後、各日を個別編集できる。
4. 範囲は開始時刻を含み終了時刻を含まない。所要時間全体が範囲に収まる開始候補だけ生成する。例: 09:00–12:00、所要時間60分なら09:00、09:30、10:00、10:30、11:00。
5. 候補は既存の `slots(start_at, end_at)` に保存し、回答集計・確定処理と互換にする。
6. サーバー側で候補の重複・日時・所要時間・上限30件を検証する。上限超過時は一部を黙って切り捨てず、保存を拒否する。
7. Asia/Tokyoで解釈する。候補時刻は30分単位、所要時間は現行フォームの選択肢（30/60/90/120分）に限定する。
8. 既存の手入力候補編集を維持し、タイムライン生成候補も作成前に確認・修正できる。
9. 上限30件では複数日・長時間帯の一括適用が拒否されることがある。上限はProduct Owner決定どおり30件とし、UIで生成数を事前表示する。

### 3.2 回答者: Googleログインと新規回答

1. 回答の新規登録・編集・削除前にGoogleログインを必須とする。未ログイン時はログインへ案内し、元のイベントページへ戻せる。
2. GoogleのOIDC IDトークンをサーバーで検証し、`sub` をGoogleアカウントの安定した本人識別子として扱う。メールアドレスの一致や回答者が入力した名前・メールだけで所有権を判断しない。
3. 参加者は名前必須、招待用メールとコメントは任意、候補ごとの○△×を回答する。回答所有者はセッションから取得し、クライアント入力で指定できない。
4. 同じGoogleユーザーはイベントごとに1回答とする。再回答時は自分の既存回答の編集に案内し、二重集計・招待先重複を防ぐ。
5. 参加者の本人確認に必要なOAuthスコープは `openid`, `email`, `profile` のみとする。回答者へCalendarスコープを要求しない。
6. 学校アカウントを含む外部Googleアカウントを対象とするため、OAuth audienceはExternalにする。テスト限定ではなく一般利用へ公開する際はIn productionと必要なGoogle OAuth verificationを完了する。実設定は未確認。
7. Workspace側のブロックが残る場合、学校のGoogle Workspace管理者がOAuth client IDと必要なGoogleデータアクセスを許可する必要がある。アプリ側から強制的に突破する手段はない。

### 3.3 回答者: 編集・削除

1. イベントがopenの間、Google認証済み回答者は自分の回答を編集・削除できる。イベント確定後は変更不可。
2. サーバー側でセッションの本人IDと回答の所有者を比較する。改ざんしたresponse/event IDで他人・別イベントの回答を読取・変更できない。
3. 編集では名前、任意メール、コメント、全候補の○△×を更新できる。回答とanswersを一貫したトランザクションで保存する。
4. 削除は確認後に対象回答とanswersのみ削除し、他回答・イベントは残す。
5. 主催者のイベント編集権限は回答者本人の回答変更権限を自動的に与えない。主催者による他人の回答削除は対象外。
6. 成功・失敗時にIDトークン、セッショントークン、個人情報をログに記録しない。

## 4. Google OAuth・アクセス制御

- OIDCの `openid email profile` とCalendar APIスコープを分離する。Calendar API（`calendar.events`, `calendar.freebusy`）はGoogle Calendarを使う作成者機能にのみ要求し、回答者ログイン時に要求しない。
- 認証はサーバー側で検証済みのGoogle `sub` と既存の安全なセッションに紐付ける。メールアドレスを本人IDとして扱わない。
- OAuth state/PKCE、IDトークンの署名・issuer・audience・expiry・email_verifiedを検証する。アカウント連携時も既存の所有者分離を維持する。
- OAuthアプリのExternal/In production設定やverificationを整えても、学校Workspaceの管理者が第三者アプリを禁止している場合は許可されない。管理者の許可が必要。
- 具体的なOAuth Client ID、Google Cloud Consent Screen設定、学校Workspaceのポリシー、本番の許可状態はNOT VERIFIED。
- アプリの表示名・公開URLがそのままOAuth Client IDではない。管理者への許可依頼にはGoogle Cloud ConsoleのCredentials画面にあるOAuth Client IDを使う。Client Secretは共有しない。

## 5. 既存回答の移行

- 現在の回答はGoogleアカウント所有者と紐付いていないため、新方式導入時に既存の全匿名回答とanswersを削除する。これはProduct Owner承認済み。
- eventsとslotsは保持する。既存回答を誤ったGoogleユーザーへ紐付けたり、名前・メールの一致で推測して移行しない。
- Migrationは実行対象の回答件数をログへ個人情報なしで記録し、回答・answersの削除を一貫したトランザクションで実施する。Migration適用前に環境と対象DBを確認する。コード変更だけでProduction DBを直接操作しない。
- Googleアカウントの復旧はGoogleのアカウント復旧に委ねる。ログイン不能な場合、本人確認なしに回答へのアクセスを付与しない。

## 6. 受入条件

### タイムライン
- AC-T01: 複数日それぞれの時間範囲を30分刻みで選べる。
- AC-T02: 一括適用後、日付ごとに個別変更できる。
- AC-T03: 所要時間全体が範囲に収まる30分刻みの候補だけ生成される。
- AC-T04: 31件以上になる入力をサーバーが拒否し、候補を切り捨てない。UIは作成前に件数と超過を示す。
- AC-T05: 重複候補は一つだけ保存され、上限判定はユニーク候補に対して行われる。
- AC-T06: 保存候補は既存の回答・集計・確定処理で利用できる。

### 回答認証・管理
- AC-R01: 未ログインでは回答を登録・編集・削除できず、Googleログイン後に元のイベントへ戻れる。
- AC-R02: Calendar scopeを許可していないGoogleアカウントでも、本人認証だけで回答できる。
- AC-R03: 認証済みユーザーは自分のイベントごとに1回答を作成でき、再登録で二重回答は作られない。
- AC-R04: 正しいGoogleユーザーのみ自分の回答を読取・編集・削除できる。emailや名前の改ざん、別ユーザー・別イベントIDでは拒否される。
- AC-R05: 削除では対象回答とanswersだけが消え、集計へ反映される。他回答とイベントは残る。
- AC-R06: イベント確定後は回答を編集・削除できない。
- AC-R07: IDトークンやセッション秘密情報がURL、クライアント公開データ、ログへ漏れない。
- AC-R08: 導入Migrationでは既存の匿名回答とanswersのみ削除され、eventsとslotsは保持される。
- AC-R09: OAuth audience/公開設定がExternal/In productionで、identity-onlyログインに不要なCalendar scopeを要求しない。
- AC-R10: Workspace管理者がアプリを禁止している場合、利用者に管理者への許可申請方法を表示する。ポリシー回避を試みない。

## 7. 実装・レビュー手順

1. この仕様とGoogle OAuthの現在設定を照合し、OAuth Client ID/redirect URI/scopes/statusを確認する。秘密鍵・Client Secretを出力しない。
2. 実装前にAntigravityの独立セキュリティ・アーキテクチャ監査を再実施する。以前のパスワード認証モデルへの監査結果はこの仕様には適用せず、特にidentity-only認証、Workspace block、response ownership、既存回答削除をレビューする。
3. Antigravityが設計をPASSするまでClaude Codeは認証・Migration実装を始めない。Google Cloud管理者許可が必要な場合、アプリ側で回避策を追加しない。
4. レビュー通過後、Claude Codeが実装・テストし、CodexがAcceptance Criteria/Architecture Driftをレビュー、Antigravityが実装を独立再監査する。
5. PR mergeとdeployはProduct Ownerが判断する。

## 8. Claude Code実装引継ぎ

### Objective
30分刻み・上限30候補のタイムラインと一括設定を加える。回答は全員Googleログイン必須とし、回答者が自分の回答を編集・削除できるようにする。匿名回答は導入時に削除する。

### Relevant Files
`src/app/events/new/`, `src/app/e/[id]/`, `src/app/api/auth/google/`, `src/lib/google.ts`, `src/lib/accounts.ts`, `src/lib/auth.ts`, `src/lib/events.ts`, `src/lib/validation.ts`, `db/migrations/`, `src/app/privacy/page.tsx`

### Constraints / Security
- identity-only OAuth scopesとCalendar scopesを分離する。参加者にCalendarアクセスを要求しない。
- Ownerはemail/nameではなく、サーバー側で確認されたGoogle identityに結び付ける。
- Workspace管理者のアクセス制御を回避しない。OAuth Client ID/Client Secretをログ・回答に含めない。
- 既存の匿名回答を削除するMigrationを追加するが、events/slotsは維持する。ProductionでのMigration実行は別途環境確認後。
- 仕様にないAuth/DB/Calendar設計判断や依存追加をせず、重大な矛盾があれば止めて提案する。

### Required Tests / Definition of Done
AC-T01〜T06/AC-R01〜R10をテストで検証し、Migrationで対象行だけが削除されること、identity-onlyサインインで回答できること、Calendar未許可でも参加者ログインできること、別ユーザーアクセスが拒否されることを確認する。プライバシー表示更新、Antigravity独立再監査、Codex Architecture Drift Reviewを完了する。
