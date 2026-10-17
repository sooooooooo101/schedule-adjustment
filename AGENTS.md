<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->


## 開発チームの役割と進め方

- Product Owner: ユーザー。プロダクト範囲、仕様変更、Merge、Deployを最終判断する。
- Lead Architect / Requirements Owner: Codex。要件、設計、受入条件、実装後の設計差分レビューを担当する。
- Implementation Engineer: Claude Code（CC）。合意済み仕様の実装とテストを担当する。
- 開発環境: 通常の編集・開発作業は Antigravity IDE で行う。必要な場合だけ Xcode を使う。
- Independent Auditor: Antigravity。実装担当とは独立してセキュリティ、アーキテクチャ、品質をレビューする。Antigravity IDE と監査役の Antigravity は別の役割である。
- CI: 再現可能な品質ゲートとして扱う。CI の成功だけでセキュリティを断定しない。

## このリポジトリのSource of Truth

- `README.md`: 開発環境のセットアップ、コマンド、現在利用できる機能の入口。
- `docs/design.md`: Product Owner が意図するプロダクト仕様。ここに書かれた機能が実装済みとは限らない。
- `docs/implementation-status.md`: 現在のコードで確認できる機能、未実装機能、仕様上の未決事項。変更時はコードと一緒に更新する。

作業開始時に対象機能の該当ドキュメントとコードを読む。実装・設計・README の説明が食い違う場合は、どれかを黙って正とせず、差分を報告して判断が必要な仕様をProduct Ownerに確認する。

## Claude Codeへの実装ルール

- 実装前に目的、対象範囲、変更対象ファイル、受入条件、必要な検証を確認する。
- 設計書にあるだけの機能を実装済みとして扱わない。実装状況は `docs/implementation-status.md` と現行コードを照合する。
- 仕様に存在しない重大な設計判断を勝手に行わない。技術スタック、DB、認証・認可、外部API、セキュリティモデル、公開範囲に関わる不明点が出たら、実装を止めて選択肢と影響を提示する。
- 対象外の機能や大規模リファクタリングを同時に行わない。発見事項は報告し、別作業に分ける。
- 完了報告では実際に行った検証だけを記載し、未実施・未確認事項を明示する。

## このアプリ固有の開発上の注意

- Next.js の変更では、上記の自動生成ルールに従い、インストール済み Next.js の該当ガイドを先に読む。
- DB に接続するテスト・Migration・Build は、意図したローカルまたはテスト用DBを使うことを確認してから実行する。現在の `build` スクリプトは Migration を先に実行するため、接続先を確認せずに実行しない。
- Google OAuth token、セッション秘密鍵、暗号鍵、実際の回答者情報をログやコミットに含めない。
