import { Suspense } from "react";
import Link from "next/link";
import { listAccounts } from "@/lib/accounts";
import { requireSession } from "@/lib/auth";
import { missingCalendarScopes } from "@/lib/google";

export default function Settings() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-[max(env(safe-area-inset-top),0.5rem)]">
      <Link href="/" className="back-link pressable self-start">‹ 調整一覧</Link>
      <Suspense fallback={<p className="section-footer mt-16 text-center">読み込み中…</p>}>
        <Accounts />
      </Suspense>
    </main>
  );
}

async function Accounts() {
  const { userId } = await requireSession();
  const accounts = await listAccounts(userId);
  const primary = accounts.find((a) => a.isPrimary)?.email;
  const hasMissingScopes = accounts.some((a) => missingCalendarScopes(a.scopes).length > 0);

  return (
    <div className="flex flex-col gap-8 pt-4 pb-[max(env(safe-area-inset-bottom),2rem)]">
      <h1 className="large-title">アカウント</h1>

      <section className="flex flex-col gap-1.5">
        <h2 className="section-header">連携中の Google アカウント</h2>
        <ul className="grouped">
          {accounts.map((a) => {
            const missing = missingCalendarScopes(a.scopes).length > 0;
            return (
              <li key={a.email} className="row">
                <span className="min-w-0 flex-1 break-all">{a.email}</span>
                {missing && <span className="shrink-0 text-[0.9375rem] text-warning">権限不足</span>}
                {a.isPrimary && !missing && <span className="shrink-0 text-[0.9375rem] text-label-secondary">メイン</span>}
              </li>
            );
          })}
          <li>
            <a href="/api/auth/google" className="row pressable text-accent">
              別のアカウントを連携
            </a>
          </li>
        </ul>
        <p className="section-footer">
          {hasMissingScopes
            ? "「権限不足」のアカウントは、もう一度連携してカレンダーの権限をすべて許可してください。"
            : "メインのアカウントのカレンダーに予定を作成します。空き確認には連携中のすべてのアカウントを使います。"}
        </p>
      </section>

      <section className="flex flex-col gap-1.5">
        <ul className="grouped">
          <li>
            <form action="/api/auth/logout" method="post">
              <button type="submit" className="row pressable w-full justify-center text-danger">
                ログアウト
              </button>
            </form>
          </li>
        </ul>
        {primary && <p className="section-footer">{primary} でログイン中</p>}
      </section>
    </div>
  );
}
