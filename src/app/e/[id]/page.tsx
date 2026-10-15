import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEvent } from "@/lib/events";
import { formatSlot } from "@/lib/time";
import { Results } from "../../events/_results";
import { ResponseForm } from "./response-form";

export const metadata: Metadata = { title: "日程調整へのご回答" };

// 回答者向けの画面。ログイン不要で、リンクを知っている人だけが開ける
export default function RespondPage(props: PageProps<"/e/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),2rem)]">
      <Suspense fallback={<p className="section-footer mt-16 text-center">読み込み中…</p>}>
        <RespondContent params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

async function RespondContent({
  params,
  searchParams,
}: {
  params: PageProps<"/e/[id]">["params"];
  searchParams: PageProps<"/e/[id]">["searchParams"];
}) {
  const [{ id }, { done }] = await Promise.all([params, searchParams]);
  const event = await getEvent(id);
  if (!event) notFound();

  const header = (
    <div className="flex flex-col gap-2 pt-8">
      <p className="text-[0.9375rem] text-label-secondary">日程調整</p>
      <h1 className="large-title">{event.title}</h1>
      <p className="text-label-secondary">
        {event.durationMin}分{event.meetEnabled ? "・Google Meet" : ""}
      </p>
    </div>
  );

  if (done || event.status !== "open") {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <p className="grouped px-4 py-3">
          {event.status === "open" ? "回答を送りました。ありがとうございます。" : "この調整は締め切られました。"}
        </p>
        <section className="flex flex-col gap-1.5">
          <h2 className="section-header">みんなの回答</h2>
          <Results event={event} />
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {header}
      <ResponseForm
        eventId={event.id}
        slots={event.slots.map((s) => ({ id: s.id, label: formatSlot(s.startAt, s.endAt) }))}
      />
    </div>
  );
}
