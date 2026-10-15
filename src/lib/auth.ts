import "server-only";
import { cookies } from "next/headers";
import { env } from "./env";
import { isOwnerEmail } from "./owners";
import { SESSION_COOKIE, SESSION_MAX_AGE_SEC, signSession, verifySession, type Session } from "./session";

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySession(token, env().SESSION_SECRET);
  // OWNER_EMAILS から外したアカウントのクッキーは無効として扱う。
  if (!session || !isOwnerEmail(session.email, env().ownerEmails)) return null;
  return session;
}

export async function setSession(session: Session): Promise<void> {
  const token = await signSession(session, env().SESSION_SECRET);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env().APP_URL.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
