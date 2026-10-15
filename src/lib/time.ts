// 日時はすべて日本時間（Asia/Tokyo）で入力・表示する。

const TZ = "Asia/Tokyo";

// <input type="datetime-local"> の値（例: 2026-10-20T14:00）を日本時間として解釈する
export function parseJstLocal(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00+09:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

const dayFmt = new Intl.DateTimeFormat("ja-JP", { timeZone: TZ, month: "numeric", day: "numeric", weekday: "short" });
const timeFmt = new Intl.DateTimeFormat("ja-JP", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });

// 例: 10/20(火) 14:00〜15:00
export function formatSlot(start: Date, end: Date): string {
  const parts = Object.fromEntries(dayFmt.formatToParts(start).map((p) => [p.type, p.value]));
  return `${parts.month}/${parts.day}(${parts.weekday}) ${timeFmt.format(start)}〜${timeFmt.format(end)}`;
}
