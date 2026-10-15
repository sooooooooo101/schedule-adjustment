import { Suspense } from "react";
import { listAccounts } from "@/lib/accounts";
import { getSession } from "@/lib/auth";
import { missingCalendarScopes } from "@/lib/google";

const ERROR_MESSAGES: Record<string, string> = {
  denied: "Google ログインがキャンセルされました。",
  invalid_request: "ログイン手続きの有効期限が切れました。もう一度お試しください。",
  token: "Google との連携に失敗しました。もう一度お試しください。",
  linked_elsewhere: "その Google アカウントは、別のユーザーとしてすでに使われています。",
};

export default function Home(props: PageProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-[max(env(safe-area-inset-top),1rem)]">
      <Suspense fallback={<p className="section-footer mt-16 text-center">読み込み中…</p>}>
        <HomeContent searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

async function HomeContent({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const { error } = await searchParams;
  const message = typeof error === "string" ? ERROR_MESSAGES[error] : undefined;
  const session = await getSession();

  return session ? <Dashboard userId={session.userId} message={message} /> : <Login message={message} />;
}

function Alert({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="grouped px-4 py-3 text-[0.9375rem] text-danger">
      {message}
    </p>
  );
}

function Login({ message }: { message?: string }) {
  return (
    <>
      <div className="flex flex-1 flex-col gap-6 pt-12 pb-32">
        <h1 className="large-title">日程調整</h1>
        <p className="text-[1.0625rem] leading-relaxed text-label-secondary">
          「来週火曜の午後か水曜で1時間」と書くだけで候補日を作り、確定したら Google カレンダーへの登録と Meet の発行まで行います。
        </p>
        <Alert message={message} />
      </div>

      {/* 親指が届く下端に主操作を置く。内容は半透明の帯の下を流れる */}
      <div className="chrome fixed inset-x-0 bottom-0 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)]">
        <div className="mx-auto flex max-w-lg flex-col gap-2">
          <a href="/api/auth/google" className="button-primary pressable">
            Google でログイン
          </a>
          <p className="section-footer text-center">カレンダーの空き確認と予定作成の権限を求めます</p>
        </div>
      </div>
    </>
  );
}

async function Dashboard({ userId, message }: { userId: number; message?: string }) {
  const accounts = await listAccounts(userId);
  const primary = accounts.find((a) => a.isPrimary)?.email;
  const hasMissingScopes = accounts.some((a) => missingCalendarScopes(a.scopes).length > 0);

  return (
    <div className="flex flex-col gap-8 pt-12 pb-[max(env(safe-area-inset-bottom),2rem)]">
      <h1 className="large-title">アカウント</h1>
      <Alert message={message} />

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
