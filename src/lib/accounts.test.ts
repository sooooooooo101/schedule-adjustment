import { randomBytes } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import postgres, { type Sql } from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  AccountLinkedElsewhereError,
  MissingRefreshTokenError,
  getRefreshToken,
  linkGoogleAccount,
  listAccounts,
  signInWithGoogle,
  userExists,
} from "./accounts";

// 実際の PostgreSQL に対して動かす結合テスト。TEST_DATABASE_URL がなければ飛ばす。
const url = process.env.TEST_DATABASE_URL;
const key = randomBytes(32).toString("base64");

async function migrationFiles(): Promise<string[]> {
  return (await readdir("db/migrations")).filter((f) => f.endsWith(".sql")).sort();
}

async function freshSchema(): Promise<{ db: Sql; drop: () => Promise<void> }> {
  const schema = `test_${randomBytes(4).toString("hex")}`;
  const admin = postgres(url!, { max: 1, onnotice: () => {} });
  await admin.unsafe(`create schema ${schema}`);
  await admin.end();
  const db = postgres(url!, { max: 1, onnotice: () => {}, connection: { search_path: schema } });
  return {
    db,
    drop: async () => {
      await db.unsafe(`drop schema ${schema} cascade`);
      await db.end();
    },
  };
}

const token = (email: string, refreshToken: string | null = "rt", scopes = ["openid"]) => ({
  email,
  googleSub: `sub-${email}`,
  refreshToken,
  scopes,
});

describe.skipIf(!url)("accounts（PostgreSQL）", () => {
  let db: Sql;
  let drop: () => Promise<void>;

  beforeAll(async () => {
    ({ db, drop } = await freshSchema());
    for (const f of await migrationFiles()) {
      await db.unsafe(await readFile(`db/migrations/${f}`, "utf8"));
    }
  });

  afterAll(async () => drop?.());

  beforeEach(async () => {
    await db`truncate users, google_accounts cascade`;
  });

  it("初めてのログインでユーザーを作り、そのアカウントをメインにする", async () => {
    const userId = await signInWithGoogle(token("a@gmail.com"), db, key);
    expect(await userExists(userId, db)).toBe(true);
    expect(await listAccounts(userId, db)).toEqual([{ email: "a@gmail.com", scopes: ["openid"], isPrimary: true }]);
  });

  it("別の人は別のユーザーになり、お互いのアカウントは見えない", async () => {
    const a = await signInWithGoogle(token("a@gmail.com"), db, key);
    const b = await signInWithGoogle(token("b@gmail.com"), db, key);
    expect(a).not.toBe(b);
    expect((await listAccounts(a, db)).map((x) => x.email)).toEqual(["a@gmail.com"]);
    expect((await listAccounts(b, db)).map((x) => x.email)).toEqual(["b@gmail.com"]);
  });

  it("2回目のログインは同じユーザーになり、トークンを更新する", async () => {
    const first = await signInWithGoogle(token("a@gmail.com", "rt-1"), db, key);
    const second = await signInWithGoogle(token("a@gmail.com", "rt-2"), db, key);
    expect(second).toBe(first);
    expect(await getRefreshToken(first, "a@gmail.com", db, key)).toBe("rt-2");
  });

  it("連携した2つ目のアカウントでログインしても、同じユーザーになる", async () => {
    const userId = await signInWithGoogle(token("a@gmail.com"), db, key);
    await linkGoogleAccount(userId, token("a@work.jp"), db, key);
    expect(await signInWithGoogle(token("a@work.jp"), db, key)).toBe(userId);
    expect(await listAccounts(userId, db)).toEqual([
      { email: "a@gmail.com", scopes: ["openid"], isPrimary: true },
      { email: "a@work.jp", scopes: ["openid"], isPrimary: false },
    ]);
  });

  it("他人に連携済みのアカウントは連携できない", async () => {
    await signInWithGoogle(token("a@gmail.com"), db, key);
    const b = await signInWithGoogle(token("b@gmail.com"), db, key);
    await expect(linkGoogleAccount(b, token("a@gmail.com"), db, key)).rejects.toBeInstanceOf(
      AccountLinkedElsewhereError,
    );
  });

  it("トークンは暗号化して保存し、本人のユーザーからだけ取り出せる", async () => {
    const a = await signInWithGoogle(token("a@gmail.com", "rt-secret"), db, key);
    const b = await signInWithGoogle(token("b@gmail.com"), db, key);
    const [row] = await db`select refresh_token_enc from google_accounts where email = 'a@gmail.com'`;
    expect(row.refresh_token_enc).not.toContain("rt-secret");
    expect(await getRefreshToken(a, "a@gmail.com", db, key)).toBe("rt-secret");
    await expect(getRefreshToken(b, "a@gmail.com", db, key)).rejects.toThrow();
  });

  it("再ログインでトークンが返らなくても、保存済みのトークンを残す", async () => {
    const a = await signInWithGoogle(token("a@gmail.com", "rt-1"), db, key);
    await signInWithGoogle(token("a@gmail.com", null, ["openid", "email"]), db, key);
    expect(await getRefreshToken(a, "a@gmail.com", db, key)).toBe("rt-1");
    expect((await listAccounts(a, db))[0].scopes).toEqual(["openid", "email"]);
  });

  it("初回なのにトークンがなければ、ユーザーも作らずにエラーにする", async () => {
    await expect(signInWithGoogle(token("a@gmail.com", null), db, key)).rejects.toBeInstanceOf(
      MissingRefreshTokenError,
    );
    expect(await db`select 1 from users`).toHaveLength(0);
  });
});

describe.skipIf(!url)("0002_multi_user マイグレーション", () => {
  it("単一作成者時代のアカウントを、1人のユーザーにまとめて引き継ぐ", async () => {
    const { db, drop } = await freshSchema();
    try {
      await db.unsafe(await readFile("db/migrations/0001_init.sql", "utf8"));
      await db`
        insert into google_accounts (email, google_sub, refresh_token_enc, scopes, is_primary) values
          ('me@gmail.com', 's1', 'x', '{}', true),
          ('me@work.jp', 's2', 'x', '{}', false)
      `;
      await db.unsafe(await readFile("db/migrations/0002_multi_user.sql", "utf8"));

      const users = await db`select id::int as id, email from users`;
      expect(users).toHaveLength(1);
      expect(users[0].email).toBe("me@gmail.com");
      expect((await listAccounts(users[0].id, db)).map((a) => a.email)).toEqual(["me@gmail.com", "me@work.jp"]);
    } finally {
      await drop();
    }
  });
});
