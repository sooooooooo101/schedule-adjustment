"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createEvent } from "@/lib/events";
import { parseCreateEvent } from "@/lib/validation";

export type FormState = { error: string | null };

export async function createEventAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { userId } = await requireSession();
  const parsed = parseCreateEvent(form);
  if (!parsed.ok) return { error: parsed.error };
  const id = await createEvent(userId, parsed.value);
  redirect(`/events/${id}`);
}
