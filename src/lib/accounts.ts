import "server-only";
import type { Sql, TransactionSql } from "postgres";
import { decrypt, encrypt } from "./crypto";
import { sql } from "./db";
import { env } from "./env";

export type GoogleAccount = {
  email: string;
  scopes: string[];
  isPrimary: boolean;
};

export type GoogleTokenInput = {
  email: string;
  googleSub: string;
  refreshToken: string | null;
  scopes: string[];
};

// すでに別のユーザーに連携されている Google アカウントを、さらに連携しようとした
export class AccountLinkedElsewhereError extends Error {
  constructor(email: string) {
    super(`${email} は別のユーザーに連携されています`);
  }
}

export class MissingRefreshTokenError extends Error {
  constructor() {
    super("Google からリフレッシュトークンを受け取れませんでした。もう一度ログインしてください。");
  }
}

type Db = Sql | TransactionSql;

async function findOwner(db: Db, email: string): Promise<number | null> {
  const [row] = await db<{ user_id: number }[]>`
    select user_id::int as user_id from google_accounts where email = ${email} for update
  `;
  return row?.user_id ?? null;
}

async function updateTokens(db: Db, input: GoogleTokenInput, key: string): Promise<void> {
  // 再連携でリフレッシュトークンが返らなかった場合は、保存済みのものを使い続ける
  const enc = input.refreshToken ? encrypt(input.refreshToken, key) : null;
  await db`
    update google_accounts set
      google_sub = ${input.googleSub},
      scopes = ${input.scopes},
      refresh_token_enc = coalesce(${enc}, refresh_token_enc),
      updated_at = now()
    where email = ${input.email}
  `;
}

async function insertAccount(db: Db, userId: number, input: GoogleTokenInput, key: string): Promise<void> {
  if (!input.refreshToken) throw new MissingRefreshTokenError();
  await db`
    insert into google_accounts (email, google_sub, refresh_token_enc, scopes, user_id, is_primary)
    values (
      ${input.email}, ${input.googleSub}, ${encrypt(input.refreshToken, key)}, ${input.scopes}, ${userId},
      not exists (select 1 from google_accounts where user_id = ${userId})
    )
  `;
}

// Google ログイン。連携済みのアカウントならその持ち主として、初めてならユーザーを作ってログインする。
export async function signInWithGoogle(
  input: GoogleTokenInput,
  db: Sql = sql(),
  key: string = env().TOKEN_ENCRYPTION_KEY,
): Promise<number> {
  return db.begin(async (tx) => {
    const owner = await findOwner(tx, input.email);
    if (owner !== null) {
      await updateTokens(tx, input, key);
      return owner;
    }
    const [user] = await tx<{ id: number }[]>`
      insert into users (email) values (${input.email})
      on conflict (email) do update set email = excluded.email
      returning id::int as id
    `;
    await insertAccount(tx, user.id, input, key);
    return user.id;
  });
}

// ログイン中のユーザーに、別の Google アカウント（Workspace など）を追加で連携する。
export async function linkGoogleAccount(
  userId: number,
  input: GoogleTokenInput,
  db: Sql = sql(),
  key: string = env().TOKEN_ENCRYPTION_KEY,
): Promise<void> {
  await db.begin(async (tx) => {
    const owner = await findOwner(tx, input.email);
    if (owner === null) return insertAccount(tx, userId, input, key);
    if (owner !== userId) throw new AccountLinkedElsewhereError(input.email);
    return updateTokens(tx, input, key);
  });
}

export async function userExists(userId: number, db: Sql = sql()): Promise<boolean> {
  const [row] = await db`select 1 from users where id = ${userId}`;
  return Boolean(row);
}

export async function listAccounts(userId: number, db: Sql = sql()): Promise<GoogleAccount[]> {
  const rows = await db<{ email: string; scopes: string[]; is_primary: boolean }[]>`
    select email, scopes, is_primary from google_accounts where user_id = ${userId} order by created_at
  `;
  return rows.map((r) => ({ email: r.email, scopes: r.scopes, isPrimary: r.is_primary }));
}

export async function getRefreshToken(
  userId: number,
  email: string,
  db: Sql = sql(),
  key: string = env().TOKEN_ENCRYPTION_KEY,
): Promise<string> {
  const [row] = await db<{ refresh_token_enc: string }[]>`
    select refresh_token_enc from google_accounts where user_id = ${userId} and email = ${email}
  `;
  if (!row) throw new Error(`連携されていないアカウントです: ${email}`);
  return decrypt(row.refresh_token_enc, key);
}

export async function getPrimaryAccount(
  userId: number,
  db: Sql = sql(),
  key: string = env().TOKEN_ENCRYPTION_KEY,
): Promise<{ email: string; refreshToken: string }> {
  const [row] = await db<{ email: string; refresh_token_enc: string }[]>`
    select email, refresh_token_enc from google_accounts where user_id = ${userId} and is_primary
  `;
  if (!row) throw new Error("メインの Google アカウントが見つかりません");
  return { email: row.email, refreshToken: decrypt(row.refresh_token_enc, key) };
}
