"use client";

import { startTransition, useActionState } from "react";
import { respondAction, type FormState } from "./actions";

type SlotView = { id: number; label: string };

const CHOICES = [
  { value: "yes", mark: "○", label: "参加できる" },
  { value: "maybe", mark: "△", label: "調整すれば参加できる" },
  { value: "no", mark: "×", label: "参加できない" },
] as const;

export function ResponseForm({ eventId, slots }: { eventId: string; slots: SlotView[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(respondAction.bind(null, eventId), {
    error: null,
  });

  return (
    <form
      // action に直接渡すと送信後に入力欄がリセットされ、エラー時に入力し直しになるため、onSubmit から呼ぶ
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="flex flex-col gap-8"
    >
      <section className="flex flex-col gap-1.5">
        <h2 className="section-header">あなた</h2>
        <ul className="grouped">
          <li className="row">
            <input name="name" required maxLength={50} placeholder="お名前" autoComplete="name" className="field" />
          </li>
          <li className="row">
            <input name="email" type="email" placeholder="メールアドレス（任意）" autoComplete="email" className="field" />
          </li>
        </ul>
        <p className="section-footer">メールアドレスを入れると、日程が決まったときにカレンダーの招待が届きます。</p>
      </section>

      <section className="flex flex-col gap-1.5">
        <h2 className="section-header">候補日時</h2>
        <ul className="grouped">
          {slots.map((slot) => (
            <li key={slot.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="text-[0.9375rem]">{slot.label}</span>
              <fieldset className="segmented shrink-0">
                <legend className="sr-only">{slot.label}</legend>
                {CHOICES.map((c) => (
                  <span key={c.value} className="contents">
                    <input type="radio" id={`slot-${slot.id}-${c.value}`} name={`slot-${slot.id}`} value={c.value} required />
                    <label htmlFor={`slot-${slot.id}-${c.value}`} title={c.label}>
                      <span aria-hidden>{c.mark}</span>
                      <span className="sr-only">{c.label}</span>
                    </label>
                  </span>
                ))}
              </fieldset>
            </li>
          ))}
        </ul>
        <p className="section-footer">○ 参加できる　△ 調整すれば参加できる　× 参加できない</p>
      </section>

      <section className="flex flex-col gap-1.5">
        <ul className="grouped">
          <li className="row">
            <textarea name="comment" maxLength={500} rows={2} placeholder="コメント（任意）" className="field resize-none" />
          </li>
        </ul>
      </section>

      {state.error && (
        <p role="alert" className="grouped px-4 py-3 text-[0.9375rem] text-danger">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="button-primary pressable">
        {pending ? "送信中…" : "回答を送る"}
      </button>
    </form>
  );
}
