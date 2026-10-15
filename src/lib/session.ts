import { SignJWT, jwtVerify } from "jose";

// 作成者（自分）のログイン状態を表す署名付きクッキーの中身。
export type Session = {
  email: string;
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
  return new SignJWT({ email: session.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SEC}s`)
    .sign(toKey(secret));
}

export async function verifySession(token: string, secret: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, toKey(secret), { algorithms: ["HS256"] });
    return typeof payload.email === "string" ? { email: payload.email } : null;
  } catch {
    return null;
  }
}
