import { Suspense } from "react";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { NewEventForm } from "./new-event-form";

export default function NewEvent() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-[max(env(safe-area-inset-top),0.5rem)] pb-[max(env(safe-area-inset-bottom),2rem)]">
      <Link href="/" className="back-link pressable self-start">‹ 調整一覧</Link>
      <h1 className="large-title pt-4 pb-8">新しい調整</h1>
      <Suspense fallback={<p className="section-footer text-center">読み込み中…</p>}>
        <Guarded />
      </Suspense>
    </main>
  );
}

async function Guarded() {
  await requireSession();
  return <NewEventForm />;
}
