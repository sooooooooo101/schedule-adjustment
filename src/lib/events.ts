import "server-only";
import { randomBytes } from "node:crypto";
import type { Sql } from "postgres";
import { sql } from "./db";
import type { AnswerValue, CreateEventInput, ResponseInput } from "./validation";

export type Slot = { id: number; startAt: Date; endAt: Date };

export type EventSummary = {
  id: string;
  title: string;
  status: "open" | "confirmed";
  responseCount: number;
  createdAt: Date;
};

export type ResponseRow = {
  id: number;
  name: string;
  comment: string | null;
  answers: Record<number, AnswerValue>;
};

export type EventDetail = {
  id: string;
  title: string;
  durationMin: number;
  status: "open" | "confirmed";
  meetEnabled: boolean;
  slots: Slot[];
  responses: ResponseRow[];
};

export class EventClosedError extends Error {
  constructor() {
    super("この調整はすでに確定しています");
  }
}

// 共有リンクに使う ID。推測されないよう 128 ビットの乱数にする
export function newEventId(): string {
  return randomBytes(16).toString("base64url");
}

export async function createEvent(userId: number, input: CreateEventInput, db: Sql = sql()): Promise<string> {
  const id = newEventId();
  await db.begin(async (tx) => {
    await tx`
      insert into events (id, owner_user_id, title, duration_min, meet_enabled)
      values (${id}, ${userId}, ${input.title}, ${input.durationMin}, ${input.meetEnabled})
    `;
    const rows = input.starts.map((start) => ({
      event_id: id,
      start_at: start,
      end_at: new Date(start.getTime() + input.durationMin * 60_000),
    }));
    await tx`insert into slots ${tx(rows, "event_id", "start_at", "end_at")}`;
  });
  return id;
}

export async function listEvents(userId: number, db: Sql = sql()): Promise<EventSummary[]> {
  const rows = await db<{ id: string; title: string; status: "open" | "confirmed"; response_count: number; created_at: Date }[]>`
    select e.id, e.title, e.status, e.created_at,
      (select count(*)::int from responses r where r.event_id = e.id) as response_count
    from events e
    where e.owner_user_id = ${userId}
    order by e.created_at desc
  `;
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    responseCount: r.response_count,
    createdAt: r.created_at,
  }));
}

// ownerUserId を渡すと、その人の調整でなければ null を返す
export async function getEvent(id: string, ownerUserId?: number, db: Sql = sql()): Promise<EventDetail | null> {
  const [event] = await db<
    { id: string; title: string; duration_min: number; status: "open" | "confirmed"; meet_enabled: boolean; owner_user_id: number }[]
  >`
    select id, title, duration_min, status, meet_enabled, owner_user_id::int as owner_user_id
    from events where id = ${id}
  `;
  if (!event) return null;
  if (ownerUserId !== undefined && event.owner_user_id !== ownerUserId) return null;

  const [slots, responses, answers] = await Promise.all([
    db<{ id: number; start_at: Date; end_at: Date }[]>`
      select id::int as id, start_at, end_at from slots where event_id = ${id} order by start_at
    `,
    db<{ id: number; name: string; comment: string | null }[]>`
      select id::int as id, name, comment from responses where event_id = ${id} order by created_at
    `,
    db<{ response_id: number; slot_id: number; value: AnswerValue }[]>`
      select a.response_id::int as response_id, a.slot_id::int as slot_id, a.value
      from answers a join responses r on r.id = a.response_id
      where r.event_id = ${id}
    `,
  ]);

  const byResponse = new Map<number, Record<number, AnswerValue>>();
  for (const a of answers) {
    const m = byResponse.get(a.response_id) ?? {};
    m[a.slot_id] = a.value;
    byResponse.set(a.response_id, m);
  }

  return {
    id: event.id,
    title: event.title,
    durationMin: event.duration_min,
    status: event.status,
    meetEnabled: event.meet_enabled,
    slots: slots.map((s) => ({ id: s.id, startAt: s.start_at, endAt: s.end_at })),
    responses: responses.map((r) => ({ ...r, answers: byResponse.get(r.id) ?? {} })),
  };
}

export async function submitResponse(eventId: string, input: ResponseInput, db: Sql = sql()): Promise<void> {
  await db.begin(async (tx) => {
    const [event] = await tx<{ status: string }[]>`select status from events where id = ${eventId} for share`;
    if (!event) throw new Error("調整が見つかりません");
    if (event.status !== "open") throw new EventClosedError();

    const [response] = await tx<{ id: number }[]>`
      insert into responses (event_id, name, email, comment)
      values (${eventId}, ${input.name}, ${input.email}, ${input.comment})
      returning id::int as id
    `;
    const slotIds = [...input.answers.keys()];
    const values = [...input.answers.values()];
    // 他の調整の候補に回答を紐づけられないよう、候補がこの調整のものかを DB 側でも確かめる
    const inserted = await tx`
      insert into answers (response_id, slot_id, value)
      select ${response.id}, x.slot_id, x.value
      from unnest(${slotIds}::bigint[], ${values}::text[]) as x(slot_id, value)
      join slots s on s.id = x.slot_id and s.event_id = ${eventId}
      returning slot_id
    `;
    if (inserted.length !== slotIds.length) throw new Error("候補が一致しません");
  });
}

// 候補ごとの集計。○を2点、△を1点として並べ替えに使う
export function tally(event: EventDetail): { slot: Slot; yes: number; maybe: number; no: number; score: number }[] {
  return event.slots.map((slot) => {
    const values = event.responses.map((r) => r.answers[slot.id]);
    const yes = values.filter((v) => v === "yes").length;
    const maybe = values.filter((v) => v === "maybe").length;
    const no = values.filter((v) => v === "no").length;
    return { slot, yes, maybe, no, score: yes * 2 + maybe };
  });
}
