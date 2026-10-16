"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPrimaryAccount } from "@/lib/accounts";
import { requireSession } from "@/lib/auth";
import { ReauthRequiredError, createGoogleCalendarEvent } from "@/lib/calendar-api";
import { EventNotConfirmableError, confirmEvent, createEvent } from "@/lib/events";
import { parseCreateEvent } from "@/lib/validation";

export type FormState = { error: string | null };

export async function createEventAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { userId } = await requireSession();
  const parsed = parseCreateEvent(form);
  if (!parsed.ok) return { error: parsed.error };
  const id = await createEvent(userId, parsed.value);
  redirect(`/events/${id}`);
}

export type ConfirmState = { error: string | null };

export async function confirmAction(eventId: string, slotId: number): Promise<ConfirmState> {
  const { userId } = await requireSession();
  try {
    await confirmEvent(eventId, userId, slotId, {
      primaryAccount: (id) => getPrimaryAccount(id),
      createCalendarEvent: createGoogleCalendarEvent,
    });
  } catch (e) {
    if (e instanceof ReauthRequiredError) {
      return { error: "Google カレンダーに登録できませんでした。アカウント画面から Google の連携をやり直してください。" };
    }
    if (e instanceof EventNotConfirmableError) return { error: e.message };
    console.error("確定に失敗しました", e);
    return { error: "確定に失敗しました。時間をおいてもう一度お試しください。" };
  }
  revalidatePath(`/events/${eventId}`);
  return { error: null };
}
