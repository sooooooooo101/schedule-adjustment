import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import postgres, { type Sql } from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getRefreshToken, listAccounts, upsertAccount } from "./accounts";

// 実際の PostgreSQL に対して動かす結合テスト。TEST_DATABASE_URL がなければ飛ばす。
const url = process.env.TEST_DATABASE_URL;
const key = randomBytes(32).toString("base64");
const schema = `test_${randomBytes(4).toString("hex")}`;

describe.skipIf(!url)("accounts（PostgreSQL）", () => {
  let db: Sql;

  beforeAll(async () => {
    const admin = postgres(url!, { max: 1, onnotice: () => {} });
    await admin.unsafe(`create schema ${schema}`);
    await admin.end();
    db = postgres(url!, { max: 1, onnotice: () => {}, connection: { search_path: schema } });
    await db.unsafe(await readFile("db/migrations/0001_init.sql", "utf8"));
  });

  afterAll(async () => {
    await db?.unsafe(`drop schema ${schema} cascade`);
    await db?.end();
  });

  beforeEach(async () => {
    await db`truncate google_accounts cascade`;
  });

  const base = { googleSub: "sub-1", scopes: ["openid", "email"] };

  it("最初に連携したアカウントだけがメインになる", async () => {
    await upsertAccount({ ...base, email: "me@gmail.com", refreshToken: "rt-1" }, db, key);
    await upsertAccount({ ...base, email: "me@work.jp", googleSub: "sub-2", refreshToken: "rt-2" }, db, key);
    expect(await listAccounts(db)).toEqual([
      { email: "me@gmail.com", scopes: ["openid", "email"], isPrimary: true },
      { email: "me@work.jp", scopes: ["openid", "email"], isPrimary: false },
    ]);
  });

  it("リフレッシュトークンは暗号化して保存し、復号して取り出せる", async () => {
    await upsertAccount({ ...base, email: "me@gmail.com", refreshToken: "rt-secret" }, db, key);
    const [row] = await db`select refresh_token_enc from google_accounts`;
    expect(row.refresh_token_enc).not.toContain("rt-secret");
    expect(await getRefreshToken("me@gmail.com", db, key)).toBe("rt-secret");
  });

  it("再連携でトークンが返らなくても、保存済みのトークンを残して権限だけ更新する", async () => {
    await upsertAccount({ ...base, email: "me@gmail.com", refreshToken: "rt-1" }, db, key);
    await upsertAccount({ ...base, email: "me@gmail.com", refreshToken: null, scopes: ["openid"] }, db, key);
    expect(await getRefreshToken("me@gmail.com", db, key)).toBe("rt-1");
    expect((await listAccounts(db))[0].scopes).toEqual(["openid"]);
  });

  it("再連携で新しいトークンが返れば差し替え、メインは変わらない", async () => {
    await upsertAccount({ ...base, email: "me@gmail.com", refreshToken: "rt-1" }, db, key);
    await upsertAccount({ ...base, email: "me@gmail.com", refreshToken: "rt-2" }, db, key);
    expect(await getRefreshToken("me@gmail.com", db, key)).toBe("rt-2");
    expect((await listAccounts(db))[0].isPrimary).toBe(true);
  });

  it("初回なのにトークンがなければエラーにする", async () => {
    await expect(
      upsertAccount({ ...base, email: "me@gmail.com", refreshToken: null }, db, key),
    ).rejects.toThrow("リフレッシュトークン");
  });
});
