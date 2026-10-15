import "server-only";
import { OAuth2Client } from "google-auth-library";
import { env } from "./env";

export const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
] as const;

// ログイン途中の state と PKCE の検証用文字列を一時的に保存するクッキー。
export const OAUTH_COOKIE = "sa_oauth";

export const LOGIN_SCOPES = ["openid", "email", "profile", ...CALENDAR_SCOPES];

export function redirectUri(): string {
  return new URL("/api/auth/google/callback", env().APP_URL).toString();
}

export function oauthClient(): OAuth2Client {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = env();
  return new OAuth2Client({
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    redirectUri: redirectUri(),
  });
}

export function missingCalendarScopes(granted: string[]): string[] {
  return CALENDAR_SCOPES.filter((s) => !granted.includes(s));
}
