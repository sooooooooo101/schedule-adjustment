import { SignJWT, jwtVerify } from "jose";

// ログイン中のユーザーを表す署名付きクッキーの中身。
export type Session = {
  userId: number;
};

export const SESSION_COOKIE = "sa_session";
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30;

function toKey(secret: string): Uint8Array {
  if (secret.length < 32) {
    throw new Error("SESSION_SECRET は 32 文字以上にしてください");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(session: Session, secret: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(session.userId))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SEC}s`)
    .sign(toKey(secret));
}

export async function verifySession(token: string, secret: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, toKey(secret), { algorithms: ["HS256"] });
    const userId = Number(payload.sub);
    return Number.isSafeInteger(userId) && userId > 0 ? { userId } : null;
  } catch {
    return null;
  }
}
