import { Suspense } from "react";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { listEvents } from "@/lib/events";

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
  const events = await listEvents(userId);

  return (
    <div className="flex flex-col gap-8 pt-4 pb-[max(env(safe-area-inset-bottom),2rem)]">
      <div className="flex justify-end">
        <Link href="/settings" className="back-link pressable">アカウント</Link>
      </div>
      <h1 className="large-title -mt-4">日程調整</h1>
      <Alert message={message} />

      <Link href="/events/new" className="button-primary pressable">
        新しい調整を作る
      </Link>

      <section className="flex flex-col gap-1.5">
        <h2 className="section-header">あなたの調整</h2>
        {events.length === 0 ? (
          <p className="section-footer">まだ調整はありません。</p>
        ) : (
          <ul className="grouped">
            {events.map((e) => (
              <li key={e.id}>
                <Link href={`/events/${e.id}`} className="row pressable">
                  <span className="min-w-0 flex-1 truncate">{e.title}</span>
                  <span className="shrink-0 text-[0.9375rem] text-label-secondary">
                    {e.status === "confirmed" ? "確定済み" : `回答 ${e.responseCount}`}
                  </span>
                  <span aria-hidden className="text-label-secondary">›</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
