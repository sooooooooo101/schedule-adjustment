import { describe, expect, it } from "vitest";
import { formatSlot, parseJstLocal } from "./time";

describe("parseJstLocal", () => {
  it("入力値を日本時間として解釈する", () => {
    expect(parseJstLocal("2026-10-20T14:00")?.toISOString()).toBe("2026-10-20T05:00:00.000Z");
  });

  it("形式が違う値は拒否する", () => {
    expect(parseJstLocal("2026-10-20 14:00")).toBeNull();
    expect(parseJstLocal("")).toBeNull();
    expect(parseJstLocal("2026-13-40T99:00")).toBeNull();
  });
});

describe("formatSlot", () => {
  it("日本時間の月日・曜日・時刻で表示する", () => {
    const start = new Date("2026-10-20T05:00:00Z");
    const end = new Date("2026-10-20T06:00:00Z");
    expect(formatSlot(start, end)).toBe("10/20(火) 14:00〜15:00");
  });

  it("UTC では前日でも日本時間の日付で表示する", () => {
    const start = new Date("2026-10-19T23:30:00Z");
    expect(formatSlot(start, new Date("2026-10-20T00:30:00Z"))).toBe("10/20(火) 08:30〜09:30");
  });
});
