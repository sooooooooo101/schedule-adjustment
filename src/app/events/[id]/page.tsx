import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { env } from "@/lib/env";
import { getEvent } from "@/lib/events";
import { formatSlot } from "@/lib/time";
import { ConfirmedCard } from "../_confirmed";
import { Results } from "../_results";
import { ConfirmButton } from "./confirm-button";
import { ShareButton } from "./share-button";

export default function EventPage(props: PageProps<"/events/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-[max(env(safe-area-inset-top),0.5rem)] pb-[max(env(safe-area-inset-bottom),2rem)]">
      <Link href="/" className="back-link pressable self-start">‹ 調整一覧</Link>
      <Suspense fallback={<p className="section-footer mt-16 text-center">読み込み中…</p>}>
        <EventContent params={props.params} />
      </Suspense>
    </main>
  );
}

async function EventContent({ params }: { params: PageProps<"/events/[id]">["params"] }) {
  const { id } = await params;
  const { userId } = await requireSession();
  const event = await getEvent(id, userId);
  if (!event) notFound();

  const shareUrl = new URL(`/e/${event.id}`, env().APP_URL).toString();

  return (
    <div className="flex flex-col gap-8 pt-4">
      <div className="flex flex-col gap-2">
        <h1 className="large-title">{event.title}</h1>
        <p className="text-label-secondary">
          {event.durationMin}分{event.meetEnabled ? "・Google Meet" : ""}・回答 {event.responses.length}件
        </p>
      </div>

      {event.confirmation && (
        <ConfirmedCard
          confirmation={event.confirmation}
          links={
            event.confirmation.gcalHtmlLink
              ? [{ href: event.confirmation.gcalHtmlLink, label: "Google カレンダーで開く" }]
              : []
          }
        />
      )}

      {event.status === "confirmed" && (
        <section className="flex flex-col gap-1.5">
          <ShareButton url={shareUrl} title={event.title} />
          <p className="section-footer">回答用リンクを開いた人には、確定した日時と Meet の URL が表示されます。</p>
        </section>
      )}

      {event.status === "open" && (
        <section className="flex flex-col gap-1.5">
          <ShareButton url={shareUrl} title={event.title} />
          <p className="section-footer break-all">{shareUrl}</p>
        </section>
      )}

      <section className="flex flex-col gap-1.5">
        <h2 className="section-header">回答状況</h2>
        <Results
          event={event}
          action={
            event.status === "open"
              ? (slot) => <ConfirmButton eventId={event.id} slotId={slot.id} label={formatSlot(slot.startAt, slot.endAt)} />
              : undefined
          }
        />
        <p className="section-footer">
          {event.responses.length === 0
            ? "まだ回答はありません。リンクを送って回答を集めましょう。"
            : event.status === "open"
              ? "確定すると、メインの Google アカウントのカレンダーに予定を作り、メールアドレスのある回答者を招待します。"
              : null}
        </p>
      </section>
    </div>
  );
}
