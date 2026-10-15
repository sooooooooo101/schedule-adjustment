import { describe, expect, it } from "vitest";
import { parseCreateEvent, parseResponse } from "./validation";

const now = new Date("2026-10-15T00:00:00Z");

function form(entries: [string, string][]): FormData {
  const f = new FormData();
  for (const [k, v] of entries) f.append(k, v);
  return f;
}

describe("parseCreateEvent", () => {
  it("候補を日本時間で解釈し、重複を除いて時刻順に並べる", () => {
    const r = parseCreateEvent(
      form([
        ["title", " 定例 "],
        ["durationMin", "60"],
        ["meetEnabled", "on"],
        ["start", "2026-10-21T10:00"],
        ["start", "2026-10-20T14:00"],
        ["start", "2026-10-21T10:00"],
        ["start", ""],
      ]),
      now,
    );
    expect(r).toEqual({
      ok: true,
      value: {
        title: "定例",
        durationMin: 60,
        meetEnabled: true,
        starts: [new Date("2026-10-20T05:00:00Z"), new Date("2026-10-21T01:00:00Z")],
      },
    });
  });

  it("候補がなければエラー", () => {
    expect(parseCreateEvent(form([["title", "a"], ["durationMin", "30"]]), now)).toEqual({
      ok: false,
      error: "候補日時を1つ以上入れてください",
    });
  });

  it("過去の日時はエラー", () => {
    const r = parseCreateEvent(form([["title", "a"], ["durationMin", "30"], ["start", "2026-10-01T10:00"]]), now);
    expect(r.ok).toBe(false);
  });

  it("タイトルが空ならエラー", () => {
    const r = parseCreateEvent(form([["title", "  "], ["durationMin", "30"], ["start", "2026-10-20T10:00"]]), now);
    expect(r).toEqual({ ok: false, error: "タイトルを入れてください" });
  });

  it("Meet のチェックがなければオフ", () => {
    const r = parseCreateEvent(form([["title", "a"], ["durationMin", "30"], ["start", "2026-10-20T10:00"]]), now);
    expect(r.ok && r.value.meetEnabled).toBe(false);
  });
});

describe("parseResponse", () => {
  it("全候補の回答と名前を受け取る", () => {
    const r = parseResponse(
      form([
        ["name", " 太郎 "],
        ["email", " Taro@Example.com "],
        ["comment", ""],
        ["slot-1", "yes"],
        ["slot-2", "maybe"],
      ]),
      [1, 2],
    );
    expect(r).toEqual({
      ok: true,
      value: {
        name: "太郎",
        email: "taro@example.com",
        comment: null,
        answers: new Map([
          [1, "yes"],
          [2, "maybe"],
        ]),
      },
    });
  });

  it("回答が欠けている候補があればエラー", () => {
    const r = parseResponse(form([["name", "太郎"], ["slot-1", "yes"]]), [1, 2]);
    expect(r).toEqual({ ok: false, error: "すべての候補に ○△× を付けてください" });
  });

  it("不正な回答値や他の調整の候補は受け付けない", () => {
    expect(parseResponse(form([["name", "太郎"], ["slot-1", "ok"]]), [1]).ok).toBe(false);
    const r = parseResponse(form([["name", "太郎"], ["slot-1", "yes"], ["slot-99", "yes"]]), [1]);
    expect(r.ok && [...r.value.answers.keys()]).toEqual([1]);
  });

  it("メールアドレスは空なら null、形式が違えばエラー", () => {
    expect(parseResponse(form([["name", "a"], ["email", "x"], ["slot-1", "no"]]), [1]).ok).toBe(false);
  });
});
