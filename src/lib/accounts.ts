import "server-only";
import { decrypt, encrypt } from "./crypto";
import { env } from "./env";
import { db } from "./supabase";

export type GoogleAccount = {
  email: string;
  scopes: string[];
  isPrimary: boolean;
};

type Row = {
  email: string;
  scopes: string[];
  is_primary: boolean;
};

export async function listAccounts(): Promise<GoogleAccount[]> {
  const { data, error } = await db()
    .from("google_accounts")
    .select("email, scopes, is_primary")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as Row[]).map((r) => ({ email: r.email, scopes: r.scopes, isPrimary: r.is_primary }));
}

// Google から受け取ったトークンを保存する。最初に連携したアカウントをメインにする。
export async function upsertAccount(input: {
  email: string;
  googleSub: string;
  refreshToken: string | null;
  scopes: string[];
}): Promise<void> {
  const client = db();
  const { data: existing, error: findError } = await client
    .from("google_accounts")
    .select("email")
    .eq("email", input.email)
    .maybeSingle();
  if (findError) throw findError;

  if (!input.refreshToken && !existing) {
    throw new Error("Google からリフレッシュトークンを受け取れませんでした。もう一度ログインしてください。");
  }

  const { count, error: countError } = await client
    .from("google_accounts")
    .select("email", { count: "exact", head: true });
  if (countError) throw countError;

  const row: Record<string, unknown> = {
    email: input.email,
    google_sub: input.googleSub,
    scopes: input.scopes,
    updated_at: new Date().toISOString(),
  };
  if (input.refreshToken) {
    row.refresh_token_enc = encrypt(input.refreshToken, env().TOKEN_ENCRYPTION_KEY);
  }
  if (!existing) {
    row.is_primary = (count ?? 0) === 0;
  }

  const { error } = await client.from("google_accounts").upsert(row, { onConflict: "email" });
  if (error) throw error;
}

export async function getRefreshToken(email: string): Promise<string> {
  const { data, error } = await db()
    .from("google_accounts")
    .select("refresh_token_enc")
    .eq("email", email)
    .single();
  if (error) throw error;
  return decrypt((data as { refresh_token_enc: string }).refresh_token_enc, env().TOKEN_ENCRYPTION_KEY);
}
