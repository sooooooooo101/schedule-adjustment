import { z } from "zod";
import { parseJstLocal } from "./time";

export const ANSWER_VALUES = ["yes", "maybe", "no"] as const;
export type AnswerValue = (typeof ANSWER_VALUES)[number];

export const MAX_SLOTS = 30;

export type CreateEventInput = {
  title: string;
  durationMin: number;
  meetEnabled: boolean;
  starts: Date[];
};

export type ResponseInput = {
  name: string;
  email: string | null;
  comment: string | null;
  answers: Map<number, AnswerValue>;
};

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const createSchema = z.object({
  title: z.string().trim().min(1, "タイトルを入れてください").max(100, "タイトルは100文字以内にしてください"),
  durationMin: z.coerce.number().int().min(5, "所要時間は5分以上にしてください").max(24 * 60, "所要時間が長すぎます"),
});

export function parseCreateEvent(form: FormData, now: Date = new Date()): Result<CreateEventInput> {
  const base = createSchema.safeParse({ title: form.get("title"), durationMin: form.get("durationMin") });
  if (!base.success) return { ok: false, error: base.error.issues[0].message };

  const raw = form.getAll("start").map(String).filter((v) => v.trim() !== "");
  if (raw.length === 0) return { ok: false, error: "候補日時を1つ以上入れてください" };
  if (raw.length > MAX_SLOTS) return { ok: false, error: `候補は${MAX_SLOTS}個までです` };

  const starts: Date[] = [];
  for (const v of raw) {
    const d = parseJstLocal(v);
    if (!d) return { ok: false, error: "候補日時の形式が正しくありません" };
    if (d.getTime() < now.getTime()) return { ok: false, error: "過去の日時は候補にできません" };
    if (!starts.some((s) => s.getTime() === d.getTime())) starts.push(d);
  }
  starts.sort((a, b) => a.getTime() - b.getTime());

  return {
    ok: true,
    value: { ...base.data, meetEnabled: form.get("meetEnabled") === "on", starts },
  };
}

const responseSchema = z.object({
  name: z.string().trim().min(1, "お名前を入れてください").max(50, "お名前は50文字以内にしてください"),
  email: z.union([z.literal(""), z.email("メールアドレスの形式が正しくありません")]),
  comment: z.string().trim().max(500, "コメントは500文字以内にしてください"),
});

// slotIds はその調整の候補。全候補に回答がそろっていなければエラーにする
export function parseResponse(form: FormData, slotIds: number[]): Result<ResponseInput> {
  const base = responseSchema.safeParse({
    name: form.get("name") ?? "",
    email: String(form.get("email") ?? "").trim(),
    comment: form.get("comment") ?? "",
  });
  if (!base.success) return { ok: false, error: base.error.issues[0].message };

  const answers = new Map<number, AnswerValue>();
  for (const id of slotIds) {
    const v = form.get(`slot-${id}`);
    if (!ANSWER_VALUES.includes(v as AnswerValue)) return { ok: false, error: "すべての候補に ○△× を付けてください" };
    answers.set(id, v as AnswerValue);
  }

  return {
    ok: true,
    value: {
      name: base.data.name,
      email: base.data.email === "" ? null : base.data.email.toLowerCase(),
      comment: base.data.comment === "" ? null : base.data.comment,
      answers,
    },
  };
}
