import { randomBytes } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import postgres, { type Sql } from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { signInWithGoogle } from "./accounts";
import { EventClosedError, createEvent, getEvent, listEvents, submitResponse, tally } from "./events";

const url = process.env.TEST_DATABASE_URL;
const key = randomBytes(32).toString("base64");
const schema = `test_${randomBytes(4).toString("hex")}`;

const starts = [new Date("2030-01-07T05:00:00Z"), new Date("2030-01-08T01:00:00Z")];
const answer = (name: string, answers: [number, "yes" | "maybe" | "no"][]) => ({
  name,
  email: null,
  comment: null,
  answers: new Map(answers),
});

describe.skipIf(!url)("events（PostgreSQL）", () => {
  let db: Sql;
  let alice: number;
  let bob: number;

  beforeAll(async () => {
    const admin = postgres(url!, { max: 1, onnotice: () => {} });
    await admin.unsafe(`create schema ${schema}`);
    await admin.end();
    db = postgres(url!, { max: 1, onnotice: () => {}, connection: { search_path: schema } });
    for (const f of (await readdir("db/migrations")).filter((f) => f.endsWith(".sql")).sort()) {
      await db.unsafe(await readFile(`db/migrations/${f}`, "utf8"));
    }
  });

  afterAll(async () => {
    await db?.unsafe(`drop schema ${schema} cascade`);
    await db?.end();
  });

  beforeEach(async () => {
    await db`truncate users, google_accounts, events cascade`;
    const tok = (email: string) => ({ email, googleSub: email, refreshToken: "rt", scopes: [] });
    alice = await signInWithGoogle(tok("alice@gmail.com"), db, key);
    bob = await signInWithGoogle(tok("bob@gmail.com"), db, key);
  });

  it("作成した調整は候補ごとに所要時間ぶんの枠になり、本人の一覧にだけ出る", async () => {
    const id = await createEvent(alice, { title: "定例", durationMin: 60, meetEnabled: true, starts }, db);
    expect(id).toMatch(/^[A-Za-z0-9_-]{22}$/);

    const event = await getEvent(id, alice, db);
    expect(event?.slots.map((s) => [s.startAt.toISOString(), s.endAt.toISOString()])).toEqual([
      ["2030-01-07T05:00:00.000Z", "2030-01-07T06:00:00.000Z"],
      ["2030-01-08T01:00:00.000Z", "2030-01-08T02:00:00.000Z"],
    ]);
    expect((await listEvents(alice, db)).map((e) => e.id)).toEqual([id]);
    expect(await listEvents(bob, db)).toEqual([]);
  });

  it("他人の調整は持ち主として開けないが、回答用には開ける", async () => {
    const id = await createEvent(alice, { title: "定例", durationMin: 30, meetEnabled: false, starts }, db);
    expect(await getEvent(id, bob, db)).toBeNull();
    expect((await getEvent(id, undefined, db))?.title).toBe("定例");
  });

  it("回答を保存し、一覧の件数と集計に反映する", async () => {
    const id = await createEvent(alice, { title: "定例", durationMin: 30, meetEnabled: false, starts }, db);
    const [s1, s2] = (await getEvent(id, alice, db))!.slots;
    await submitResponse(id, answer("太郎", [[s1.id, "yes"], [s2.id, "no"]]), db);
    await submitResponse(id, answer("花子", [[s1.id, "maybe"], [s2.id, "yes"]]), db);

    const event = (await getEvent(id, alice, db))!;
    expect(event.responses.map((r) => r.name)).toEqual(["太郎", "花子"]);
    expect(tally(event).map((t) => [t.yes, t.maybe, t.no, t.score])).toEqual([
      [1, 1, 0, 3],
      [1, 0, 1, 2],
    ]);
    expect((await listEvents(alice, db))[0].responseCount).toBe(2);
  });

  it("別の調整の候補への回答は保存しない（回答ごと取り消す）", async () => {
    const a = await createEvent(alice, { title: "A", durationMin: 30, meetEnabled: false, starts }, db);
    const b = await createEvent(alice, { title: "B", durationMin: 30, meetEnabled: false, starts }, db);
    const foreignSlot = (await getEvent(b, alice, db))!.slots[0];
    await expect(submitResponse(a, answer("太郎", [[foreignSlot.id, "yes"]]), db)).rejects.toThrow();
    expect((await getEvent(a, alice, db))!.responses).toEqual([]);
  });

  it("確定済みの調整には回答できない", async () => {
    const id = await createEvent(alice, { title: "定例", durationMin: 30, meetEnabled: false, starts }, db);
    const slot = (await getEvent(id, alice, db))!.slots[0];
    await db`update events set status = 'confirmed' where id = ${id}`;
    await expect(submitResponse(id, answer("太郎", [[slot.id, "yes"]]), db)).rejects.toBeInstanceOf(EventClosedError);
  });
});
