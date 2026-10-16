"use client";

import { useState, useTransition } from "react";
import { confirmAction } from "../actions";

// 確定すると参加者に招待メールが届き取り消しにくいため、押す前に一度だけ確認する
export function ConfirmButton({ eventId, slotId, label }: { eventId: string; slotId: number; label: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    if (!window.confirm(`${label} で確定しますか？\nGoogle カレンダーに予定を作り、メールアドレスのある回答者に招待を送ります。`)) return;
    startTransition(async () => {
      const result = await confirmAction(eventId, slotId);
      setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={confirm}
        disabled={pending}
        className="pressable self-start rounded-full bg-accent/10 px-3 py-1.5 text-[0.875rem] font-semibold text-accent disabled:opacity-50"
      >
        {pending ? "登録中…" : "この日で確定"}
      </button>
      {error && (
        <p role="alert" className="text-[0.8125rem] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
