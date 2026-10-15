import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { AccountLinkedElsewhereError, linkGoogleAccount, signInWithGoogle } from "@/lib/accounts";
import { getSession, setSession } from "@/lib/auth";
import { env } from "@/lib/env";
import { OAUTH_COOKIE, oauthClient } from "@/lib/google";

function back(error?: string): Response {
  const url = new URL("/", env().APP_URL);
  if (error) url.searchParams.set("error", error);
  return Response.redirect(url, 302);
}

function sameString(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const cookieStore = await cookies();
  const saved = cookieStore.get(OAUTH_COOKIE)?.value;
  cookieStore.delete({ name: OAUTH_COOKIE, path: "/api/auth/google" });

  if (params.get("error")) return back("denied");

  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state || !saved) return back("invalid_request");

  let stored: { state: string; codeVerifier: string };
  try {
    stored = JSON.parse(saved);
  } catch {
    return back("invalid_request");
  }
  if (!sameString(state, stored.state)) return back("invalid_request");

  const client = oauthClient();
  try {
    const { tokens } = await client.getToken({ code, codeVerifier: stored.codeVerifier });
    if (!tokens.id_token) return back("token");

    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: env().GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.email_verified) return back("token");

    const input = {
      email: payload.email.toLowerCase(),
      googleSub: payload.sub,
      refreshToken: tokens.refresh_token ?? null,
      scopes: (tokens.scope ?? "").split(" ").filter(Boolean),
    };

    // ログイン中なら追加のアカウント連携、そうでなければログイン（初回は登録）
    const session = await getSession();
    if (session) {
      await linkGoogleAccount(session.userId, input);
    } else {
      await setSession({ userId: await signInWithGoogle(input) });
    }
    return back();
  } catch (e) {
    if (e instanceof AccountLinkedElsewhereError) return back("linked_elsewhere");
    console.error("Google ログインに失敗しました", e);
    return back("token");
  }
}
