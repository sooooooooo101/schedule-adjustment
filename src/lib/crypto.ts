import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// リフレッシュトークンを DB に平文で置かないための AES-256-GCM 暗号化。
// 保存形式: base64(iv) + "." + base64(authTag) + "." + base64(ciphertext)

const IV_LENGTH = 12;

function toKey(base64Key: string): Buffer {
  const key = Buffer.from(base64Key, "base64");
  if (key.length !== 32) {
    throw new Error("暗号化キーは base64 で 32 バイトである必要があります");
  }
  return key;
}

export function encrypt(plaintext: string, base64Key: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", toKey(base64Key), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((b) => b.toString("base64")).join(".");
}

export function decrypt(payload: string, base64Key: string): string {
  const parts = payload.split(".");
  if (parts.length !== 3) {
    throw new Error("暗号文の形式が不正です");
  }
  const [iv, tag, ciphertext] = parts.map((p) => Buffer.from(p, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", toKey(base64Key), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
