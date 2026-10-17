import { describe, expect, it, vi } from "vitest";
import { nextShareStatus, shareOrCopy } from "./share-button";

const data = { title: "飲み会", text: "回答してください", url: "https://example.com/e/abc" };

describe("shareOrCopy", () => {
  it("共有シートが成功したらコピーしない", async () => {
    const writeText = vi.fn();
    const result = await shareOrCopy({ share: vi.fn().mockResolvedValue(undefined), clipboard: { writeText } }, data);
    expect(result).toBe("shared");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("利用者が共有を取り消したらエラーにもコピーにもしない", async () => {
    const writeText = vi.fn();
    const share = vi.fn().mockRejectedValue(new DOMException("canceled", "AbortError"));
    expect(await shareOrCopy({ share, clipboard: { writeText } }, data)).toBe("cancelled");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("共有シートが取り消し以外で失敗したらリンクをコピーする", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const share = vi.fn().mockRejectedValue(new DOMException("denied", "NotAllowedError"));
    expect(await shareOrCopy({ share, clipboard: { writeText } }, data)).toBe("copied");
    expect(writeText).toHaveBeenCalledWith(data.url);
  });

  it("共有シートがなければリンクをコピーする", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    expect(await shareOrCopy({ clipboard: { writeText } }, data)).toBe("copied");
  });

  it("コピーが拒否されたら例外を出さずに手動コピーにする", async () => {
    const writeText = vi.fn().mockRejectedValue(new DOMException("denied", "NotAllowedError"));
    await expect(shareOrCopy({ clipboard: { writeText } }, data)).resolves.toBe("manual");
  });

  it("共有もクリップボードもない環境では手動コピーにする", async () => {
    expect(await shareOrCopy({}, data)).toBe("manual");
    expect(await shareOrCopy({ clipboard: {} }, data)).toBe("manual");
  });
});

describe("nextShareStatus", () => {
  it("手動コピーのあとに共有できたら、手動コピー欄を消す", () => {
    expect(nextShareStatus("manual", "shared")).toBe("idle");
  });

  it("コピー成功の表示中に手動コピーになったら、古い「コピーしました」を残さない", () => {
    expect(nextShareStatus("copied", "manual")).toBe("manual");
  });

  it("手動コピーのあとにコピーできたら、手動コピー欄を消して成功を表示する", () => {
    expect(nextShareStatus("manual", "copied")).toBe("copied");
  });

  it("取り消しのときは直前の表示を変えない", () => {
    expect(nextShareStatus("manual", "cancelled")).toBe("manual");
    expect(nextShareStatus("idle", "cancelled")).toBe("idle");
  });
});
