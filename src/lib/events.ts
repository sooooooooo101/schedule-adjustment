import "server-only";
import { randomBytes } from "node:crypto";
import type { Sql } from "postgres";
import { sql } from "./db";
import type { CalendarEventInput } from "./calendar";
import type { CreatedCalendarEvent } from "./calendar-api";
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

export type Confirmation = {
  slot: Slot;
  meetUrl: string | null;
  gcalHtmlLink: string | null;
  calendarAccountEmail: string | null;
};

export type EventDetail = {
  id: string;
  title: string;
  durationMin: number;
  status: "open" | "confirmed";
  meetEnabled: boolean;
  slots: Slot[];
  responses: ResponseRow[];
  confirmation: Confirmation | null;
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
    {
      id: string;
      title: string;
      duration_min: number;
      status: "open" | "confirmed";
      meet_enabled: boolean;
      owner_user_id: number;
      confirmed_slot_id: number | null;
      meet_url: string | null;
      gcal_html_link: string | null;
      calendar_account_email: string | null;
    }[]
  >`
    select id, title, duration_min, status, meet_enabled, owner_user_id::int as owner_user_id,
      confirmed_slot_id::int as confirmed_slot_id, meet_url, gcal_html_link, calendar_account_email
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

  const slotList = slots.map((s) => ({ id: s.id, startAt: s.start_at, endAt: s.end_at }));
  const confirmedSlot = slotList.find((s) => s.id === event.confirmed_slot_id);

  return {
    id: event.id,
    title: event.title,
    durationMin: event.duration_min,
    status: event.status,
    meetEnabled: event.meet_enabled,
    slots: slotList,
    responses: responses.map((r) => ({ ...r, answers: byResponse.get(r.id) ?? {} })),
    confirmation:
      event.status === "confirmed" && confirmedSlot
        ? {
            slot: confirmedSlot,
            meetUrl: event.meet_url,
            gcalHtmlLink: event.gcal_html_link,
            calendarAccountEmail: event.calendar_account_email,
          }
        : null,
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

export class EventNotConfirmableError extends Error {}

export type ConfirmDeps = {
  // 作成者のメインの Google アカウントのメールアドレスとリフレッシュトークン
  primaryAccount: (userId: number) => Promise<{ email: string; refreshToken: string }>;
  createCalendarEvent: (refreshToken: string, input: CalendarEventInput) => Promise<CreatedCalendarEvent>;
};

// 候補を確定し、作成者のカレンダーに予定を作って回答者を招待する。
// 先に DB 上で確定済みにしてから Google に送ることで、二重押しによる予定の重複を防ぐ。
// Google 側で失敗したら確定を取り消し、もう一度押せるようにする。
export async function confirmEvent(
  eventId: string,
  userId: number,
  slotId: number,
  deps: ConfirmDeps,
  db: Sql = sql(),
): Promise<void> {
  const claimed = await db<{ title: string; meet_enabled: boolean; start_at: Date; end_at: Date }[]>`
    update events e set status = 'confirmed', confirmed_slot_id = s.id, confirmed_at = now()
    from slots s
    where e.id = ${eventId} and e.owner_user_id = ${userId} and e.status = 'open'
      and s.id = ${slotId} and s.event_id = e.id
    returning e.title, e.meet_enabled, s.start_at, s.end_at
  `;
  if (claimed.length === 0) throw new EventNotConfirmableError("この調整は確定できません（確定済み、または候補が見つかりません）");
  const event = claimed[0];

  try {
    const attendees = await db<{ email: string }[]>`
      select distinct email from responses where event_id = ${eventId} and email is not null
    `;
    const account = await deps.primaryAccount(userId);
    const created = await deps.createCalendarEvent(account.refreshToken, {
      title: event.title,
      start: event.start_at,
      end: event.end_at,
      attendees: attendees.map((a) => a.email),
      withMeet: event.meet_enabled,
      description: "日程調整アプリで確定した予定です。",
      requestId: `${eventId}-${slotId}`,
    });
    await db`
      update events set
        gcal_event_id = ${created.id}, meet_url = ${created.meetUrl}, gcal_html_link = ${created.htmlLink},
        calendar_account_email = ${account.email}
      where id = ${eventId}
    `;
  } catch (e) {
    await db`
      update events set status = 'open', confirmed_slot_id = null, confirmed_at = null
      where id = ${eventId}
    `;
    throw e;
  }
}
