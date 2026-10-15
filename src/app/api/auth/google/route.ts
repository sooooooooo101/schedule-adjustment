import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { CodeChallengeMethod } from "google-auth-library";
import { env } from "@/lib/env";
import { LOGIN_SCOPES, OAUTH_COOKIE, oauthClient } from "@/lib/google";

// Google ログインを開始する。2つ目以降のアカウント連携も同じ入口を使う。
export async function GET() {
  // 毎回新しい state を発行するため、ビルド時の静的生成をさせない。
  await connection();
  const client = oauthClient();
  const state = randomBytes(24).toString("base64url");
  const { codeVerifier, codeChallenge } = await client.generateCodeVerifierAsync();

  (await cookies()).set(OAUTH_COOKIE, JSON.stringify({ state, codeVerifier }), {
    httpOnly: true,
    secure: env().APP_URL.startsWith("https://"),
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: 600,
  });

  const url = client.generateAuthUrl({
    access_type: "offline",
    // 毎回リフレッシュトークンを受け取り、アカウントも選び直せるようにする。
    prompt: "consent select_account",
    scope: LOGIN_SCOPES,
    include_granted_scopes: true,
    state,
    code_challenge_method: CodeChallengeMethod.S256,
    code_challenge: codeChallenge,
  });
  return Response.redirect(url, 302);
}
