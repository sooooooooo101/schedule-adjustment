"use client";

import { startTransition, useActionState, useState } from "react";
import { createEventAction, type FormState } from "../actions";

const DURATIONS = [30, 60, 90, 120];

let nextKey = 1;

export function NewEventForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createEventAction, { error: null });
  const [slots, setSlots] = useState<{ key: number; value: string }[]>([{ key: 0, value: "" }]);

  // 直前の候補と同じ時刻の翌日を初期値にすると、続けて追加しやすい
  function addSlot() {
    const last = slots.at(-1)?.value;
    let value = "";
    if (last) {
      const d = new Date(`${last}:00Z`);
      d.setUTCDate(d.getUTCDate() + 1);
      value = d.toISOString().slice(0, 16);
    }
    setSlots([...slots, { key: nextKey++, value }]);
  }

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
        <h2 className="section-header">内容</h2>
        <ul className="grouped">
          <li className="row">
            <input name="title" required maxLength={100} placeholder="タイトル（例: 打ち合わせ）" className="field" />
          </li>
          <li className="row">
            <label htmlFor="durationMin" className="flex-1">所要時間</label>
            <select id="durationMin" name="durationMin" defaultValue="60" className="field w-auto text-right text-label-secondary">
              {DURATIONS.map((m) => (
                <option key={m} value={m}>
                  {m < 60 ? `${m}分` : `${m / 60}時間`}
                </option>
              ))}
            </select>
          </li>
          <li className="row">
            <label htmlFor="meetEnabled" className="flex-1">Google Meet を付ける</label>
            <input id="meetEnabled" name="meetEnabled" type="checkbox" defaultChecked className="size-5 accent-[var(--accent)]" />
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-1.5">
        <h2 className="section-header">候補日時（開始時刻）</h2>
        <ul className="grouped">
          {slots.map((slot, i) => (
            <li key={slot.key} className="row">
              <input
                name="start"
                type="datetime-local"
                required
                value={slot.value}
                onChange={(e) => setSlots(slots.map((s) => (s.key === slot.key ? { ...s, value: e.target.value } : s)))}
                aria-label={`候補 ${i + 1}`}
                className="field"
              />
              {slots.length > 1 && (
                <button
                  type="button"
                  onClick={() => setSlots(slots.filter((s) => s.key !== slot.key))}
                  aria-label={`候補 ${i + 1} を削除`}
                  className="pressable shrink-0 px-1 text-danger"
                >
                  削除
                </button>
              )}
            </li>
          ))}
          <li>
            <button type="button" onClick={addSlot} className="row pressable w-full text-accent">
              候補を追加
            </button>
          </li>
        </ul>
        <p className="section-footer">日本時間で入力します。終了時刻は所要時間から自動で決まります。</p>
      </section>

      {state.error && (
        <p role="alert" className="grouped px-4 py-3 text-[0.9375rem] text-danger">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="button-primary pressable">
        {pending ? "作成中…" : "調整を作成"}
      </button>
    </form>
  );
}
