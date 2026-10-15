import { describe, expect, it } from "vitest";
import { isOwnerEmail, parseOwnerEmails } from "./owners";

describe("parseOwnerEmails / isOwnerEmail", () => {
  const owners = parseOwnerEmails(" Me@Gmail.com, work@example.co.jp ,, ");

  it("空白と大文字小文字を正規化する", () => {
    expect(owners).toEqual(["me@gmail.com", "work@example.co.jp"]);
  });

  it("一覧にあるアカウントだけ許可する", () => {
    expect(isOwnerEmail("ME@gmail.com", owners)).toBe(true);
    expect(isOwnerEmail("friend@gmail.com", owners)).toBe(false);
  });
});
