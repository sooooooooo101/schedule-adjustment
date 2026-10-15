import "server-only";
import { cookies } from "next/headers";
import { userExists } from "./accounts";
import { env } from "./env";
import { SESSION_COOKIE, SESSION_MAX_AGE_SEC, signSession, verifySession, type Session } from "./session";

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySession(token, env().SESSION_SECRET);
  // 削除されたユーザーのクッキーは無効として扱う
  if (!session || !(await userExists(session.userId))) return null;
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
