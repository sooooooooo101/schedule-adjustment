import "server-only";
import { buildEventRequest, type CalendarEventInput } from "./calendar";
import { oauthClient } from "./google";

export type CreatedCalendarEvent = { id: string; htmlLink: string | null; meetUrl: string | null };

// 連携が切れている・権限が足りないなど、ユーザーにもう一度連携してもらう必要がある
export class ReauthRequiredError extends Error {
  constructor(detail: string) {
    super(`Google との連携をやり直してください（${detail}）`);
  }
}

export async function createGoogleCalendarEvent(
  refreshToken: string,
  input: CalendarEventInput,
): Promise<CreatedCalendarEvent> {
  const client = oauthClient();
  client.setCredentials({ refresh_token: refreshToken });
  let accessToken: string | null | undefined;
  try {
    ({ token: accessToken } = await client.getAccessToken());
  } catch (e) {
    throw new ReauthRequiredError(e instanceof Error ? e.message : "トークンを更新できません");
  }
  if (!accessToken) throw new ReauthRequiredError("アクセストークンを取得できません");

  const { url, body } = buildEventRequest(input);
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 401 || res.status === 403) {
    throw new ReauthRequiredError(`Google Calendar API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  if (!res.ok) throw new Error(`Google Calendar API ${res.status}: ${(await res.text()).slice(0, 500)}`);

  const data = (await res.json()) as {
    id: string;
    htmlLink?: string;
    hangoutLink?: string;
    conferenceData?: { entryPoints?: { entryPointType: string; uri: string }[] };
  };
  const meetUrl =
    data.hangoutLink ?? data.conferenceData?.entryPoints?.find((p) => p.entryPointType === "video")?.uri ?? null;
  return { id: data.id, htmlLink: data.htmlLink ?? null, meetUrl };
}
