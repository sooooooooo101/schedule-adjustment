// Google Calendar API 呼び出しの組み立て（純粋関数）。通信は calendar-api.ts で行う。

export type CalendarEventInput = {
  title: string;
  start: Date;
  end: Date;
  attendees: string[];
  withMeet: boolean;
  description: string;
  requestId: string; // Meet 発行の重複防止キー
};

export function buildEventRequest(input: CalendarEventInput) {
  const body: Record<string, unknown> = {
    summary: input.title,
    description: input.description,
    start: { dateTime: input.start.toISOString(), timeZone: "Asia/Tokyo" },
    end: { dateTime: input.end.toISOString(), timeZone: "Asia/Tokyo" },
    attendees: [...new Set(input.attendees.map((e) => e.toLowerCase()))].map((email) => ({ email })),
  };
  if (input.withMeet) {
    body.conferenceData = {
      createRequest: { requestId: input.requestId, conferenceSolutionKey: { type: "hangoutsMeet" } },
    };
  }
  const params = new URLSearchParams({ sendUpdates: "all" });
  if (input.withMeet) params.set("conferenceDataVersion", "1");
  return {
    url: `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    body,
  };
}

// 20261020T050000Z の形式（Google カレンダーのリンクと iCalendar で使う）
export function toUtcStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// 回答者が自分の Google カレンダーに追加するためのリンク
export function googleCalendarAddUrl(e: { title: string; start: Date; end: Date; details?: string }): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${toUtcStamp(e.start)}/${toUtcStamp(e.end)}`,
    ctz: "Asia/Tokyo",
  });
  if (e.details) params.set("details", e.details);
  return `https://calendar.google.com/calendar/render?${params}`;
}

function escapeIcs(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
}

// Google 以外のカレンダー（iPhone 標準など）向けの .ics
export function buildIcs(e: { uid: string; title: string; start: Date; end: Date; description?: string; url?: string }): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//schedule-adjustment//JA",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `DTSTAMP:${toUtcStamp(new Date())}`,
    `DTSTART:${toUtcStamp(e.start)}`,
    `DTEND:${toUtcStamp(e.end)}`,
    `SUMMARY:${escapeIcs(e.title)}`,
  ];
  if (e.description) lines.push(`DESCRIPTION:${escapeIcs(e.description)}`);
  if (e.url) lines.push(`URL:${e.url}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
