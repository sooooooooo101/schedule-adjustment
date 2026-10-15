import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decrypt, encrypt } from "./crypto";

const key = randomBytes(32).toString("base64");

describe("encrypt / decrypt", () => {
  it("暗号化した値を元に戻せる", () => {
    const token = "1//0g-refresh-token-例";
    expect(decrypt(encrypt(token, key), key)).toBe(token);
  });

  it("同じ値でも毎回異なる暗号文になる", () => {
    expect(encrypt("same", key)).not.toBe(encrypt("same", key));
  });

  it("別のキーでは復号できない", () => {
    const other = randomBytes(32).toString("base64");
    expect(() => decrypt(encrypt("secret", key), other)).toThrow();
  });

  it("改ざんされた暗号文は復号できない", () => {
    const [iv, tag, body] = encrypt("secret", key).split(".");
    const tampered = Buffer.from(body, "base64");
    tampered[0] ^= 1;
    expect(() => decrypt([iv, tag, tampered.toString("base64")].join("."), key)).toThrow();
  });

  it("32 バイトでないキーは拒否する", () => {
    expect(() => encrypt("x", randomBytes(16).toString("base64"))).toThrow();
  });
});
