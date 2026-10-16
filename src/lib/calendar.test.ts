import { describe, expect, it } from "vitest";
import { buildEventRequest, buildIcs, googleCalendarAddUrl, toUtcStamp } from "./calendar";

const start = new Date("2030-01-07T10:00:00Z");
const end = new Date("2030-01-07T11:00:00Z");

describe("buildEventRequest", () => {
  it("Meet 付きなら会議の作成要求を入れ、招待を全員に送る", () => {
    const r = buildEventRequest({
      title: "飲み会",
      start,
      end,
      attendees: ["A@example.com", "a@example.com", "b@example.com"],
      withMeet: true,
      description: "d",
      requestId: "req-1",
    });
    expect(r.url).toBe(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all&conferenceDataVersion=1",
    );
    expect(r.body).toMatchObject({
      summary: "飲み会",
      start: { dateTime: "2030-01-07T10:00:00.000Z", timeZone: "Asia/Tokyo" },
      attendees: [{ email: "a@example.com" }, { email: "b@example.com" }],
      conferenceData: { createRequest: { requestId: "req-1", conferenceSolutionKey: { type: "hangoutsMeet" } } },
    });
  });

  it("Meet なしなら会議の作成要求を入れない", () => {
    const r = buildEventRequest({ title: "t", start, end, attendees: [], withMeet: false, description: "", requestId: "x" });
    expect(r.url).not.toContain("conferenceDataVersion");
    expect(r.body).not.toHaveProperty("conferenceData");
  });
});

describe("カレンダー追加用", () => {
  it("UTC の時刻表記にする", () => {
    expect(toUtcStamp(start)).toBe("20300107T100000Z");
  });

  it("Google カレンダーの追加リンクを作る", () => {
    const url = new URL(googleCalendarAddUrl({ title: "飲み会", start, end, details: "Meet: x" }));
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("dates")).toBe("20300107T100000Z/20300107T110000Z");
    expect(url.searchParams.get("text")).toBe("飲み会");
  });

  it(".ics は改行と区切り文字をエスケープする", () => {
    const ics = buildIcs({ uid: "u1", title: "a,b;c", start, end, description: "1行目\n2行目" });
    expect(ics).toContain("SUMMARY:a\\,b\\;c\r\n");
    expect(ics).toContain("DESCRIPTION:1行目\\n2行目\r\n");
    expect(ics).toContain("DTSTART:20300107T100000Z\r\n");
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
  });
});
