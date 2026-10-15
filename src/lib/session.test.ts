import { describe, expect, it } from "vitest";
import { signSession, verifySession } from "./session";

const secret = "a".repeat(32);

describe("signSession / verifySession", () => {
  it("署名したセッションを検証できる", async () => {
    const token = await signSession({ email: "me@example.com" }, secret);
    expect(await verifySession(token, secret)).toEqual({ email: "me@example.com" });
  });

  it("別の秘密鍵で署名されたトークンは拒否する", async () => {
    const token = await signSession({ email: "me@example.com" }, "b".repeat(32));
    expect(await verifySession(token, secret)).toBeNull();
  });

  it("壊れたトークンは拒否する", async () => {
    expect(await verifySession("not-a-jwt", secret)).toBeNull();
  });

  it("短すぎる秘密鍵は使わせない", async () => {
    await expect(signSession({ email: "me@example.com" }, "short")).rejects.toThrow();
  });
});
