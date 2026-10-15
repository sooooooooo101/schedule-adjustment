"use server";

import { redirect } from "next/navigation";
import { EventClosedError, getEvent, submitResponse } from "@/lib/events";
import { parseResponse } from "@/lib/validation";

export type FormState = { error: string | null };

// 回答はログイン不要。候補の一覧はクライアントから受け取らず、DB から読み直して照合する
export async function respondAction(eventId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const event = await getEvent(eventId);
  if (!event) return { error: "調整が見つかりません。" };
  if (event.status !== "open") return { error: "この調整はすでに確定しています。" };

  const parsed = parseResponse(form, event.slots.map((s) => s.id));
  if (!parsed.ok) return { error: parsed.error };

  try {
    await submitResponse(eventId, parsed.value);
  } catch (e) {
    if (e instanceof EventClosedError) return { error: "この調整はすでに確定しています。" };
    throw e;
  }
  redirect(`/e/${eventId}?done=1`);
}
