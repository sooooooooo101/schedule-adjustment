import "server-only";
import { z } from "zod";
import { parseOwnerEmails } from "./owners";

const schema = z.object({
  APP_URL: z.url(),
  OWNER_EMAILS: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  TOKEN_ENCRYPTION_KEY: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  SUPABASE_URL: z.url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
});

export type Env = z.infer<typeof schema> & { ownerEmails: string[] };

let cached: Env | null = null;

// ビルド時に環境変数がなくても落ちないよう、初回利用時に検証する。
export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const names = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`環境変数が不足または不正です: ${names}（.env.example を参照）`);
  }
  cached = { ...parsed.data, ownerEmails: parseOwnerEmails(parsed.data.OWNER_EMAILS) };
  return cached;
}
