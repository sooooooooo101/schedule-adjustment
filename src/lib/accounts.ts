import "server-only";
import type { Sql } from "postgres";
import { decrypt, encrypt } from "./crypto";
import { sql } from "./db";
import { env } from "./env";

export type GoogleAccount = {
  email: string;
  scopes: string[];
  isPrimary: boolean;
};

export type UpsertAccountInput = {
  email: string;
  googleSub: string;
  refreshToken: string | null;
  scopes: string[];
};

export async function listAccounts(db: Sql = sql()): Promise<GoogleAccount[]> {
  const rows = await db<{ email: string; scopes: string[]; is_primary: boolean }[]>`
    select email, scopes, is_primary from google_accounts order by created_at
  `;
  return rows.map((r) => ({ email: r.email, scopes: r.scopes, isPrimary: r.is_primary }));
}

// Google から受け取ったトークンを保存する。最初に連携したアカウントをメインにする。
// 再連携でリフレッシュトークンが返らなかった場合は、保存済みのものを使い続ける。
export async function upsertAccount(
  input: UpsertAccountInput,
  db: Sql = sql(),
  encryptionKey: string = env().TOKEN_ENCRYPTION_KEY,
): Promise<void> {
  if (input.refreshToken) {
    const enc = encrypt(input.refreshToken, encryptionKey);
    await db`
      insert into google_accounts (email, google_sub, refresh_token_enc, scopes, is_primary)
      values (
        ${input.email}, ${input.googleSub}, ${enc}, ${input.scopes},
        not exists (select 1 from google_accounts)
      )
      on conflict (email) do update set
        google_sub = excluded.google_sub,
        refresh_token_enc = excluded.refresh_token_enc,
        scopes = excluded.scopes,
        updated_at = now()
    `;
    return;
  }

  const updated = await db`
    update google_accounts
    set google_sub = ${input.googleSub}, scopes = ${input.scopes}, updated_at = now()
    where email = ${input.email}
    returning email
  `;
  if (updated.length === 0) {
    throw new Error("Google からリフレッシュトークンを受け取れませんでした。もう一度ログインしてください。");
  }
}

export async function getRefreshToken(
  email: string,
  db: Sql = sql(),
  encryptionKey: string = env().TOKEN_ENCRYPTION_KEY,
): Promise<string> {
  const [row] = await db<{ refresh_token_enc: string }[]>`
    select refresh_token_enc from google_accounts where email = ${email}
  `;
  if (!row) throw new Error(`連携されていないアカウントです: ${email}`);
  return decrypt(row.refresh_token_enc, encryptionKey);
}
