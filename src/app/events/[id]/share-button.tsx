"use client";

import { useEffect, useId, useRef, useState } from "react";

export type ShareResult = "shared" | "cancelled" | "copied" | "manual";

type ShareNavigator = {
  share?: (data: ShareData) => Promise<void>;
  clipboard?: { writeText?: (text: string) => Promise<void> };
};

// 共有シート → クリップボード → 手動コピーの順に試す。例外は外に出さない
export async function shareOrCopy(nav: ShareNavigator, data: ShareData & { url: string }): Promise<ShareResult> {
  if (typeof nav.share === "function") {
    try {
      await nav.share(data);
      return "shared";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
    }
  }
  if (typeof nav.clipboard?.writeText === "function") {
    try {
      await nav.clipboard.writeText(data.url);
      return "copied";
    } catch {
      // 権限がない・安全でない接続などで失敗する。手動コピーに切り替える
    }
  }
  return "manual";
}

// スマホでは共有シート（LINE などに送れる）、使えない環境ではリンクをコピーする
export function ShareButton({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const [manual, setManual] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hintId = useId();

  // 手動コピー欄が出たら、そのままコピーできるよう選択状態でフォーカスする
  useEffect(() => {
    if (manual) inputRef.current?.select();
  }, [manual]);

  async function share() {
    const result = await shareOrCopy(navigator, {
      title,
      text: `「${title}」の日程調整にご回答ください`,
      url,
    });
    if (result === "copied") {
      setManual(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else if (result === "manual") {
      setManual(true);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={share} className="button-primary pressable">
        {copied ? "リンクをコピーしました" : "回答用リンクを送る"}
      </button>
      {manual && (
        <div className="flex flex-col gap-1.5">
          <p id={hintId} role="status" className="section-footer">
            この端末では自動でコピーできませんでした。下のリンクを長押し（またはすべて選択）してコピーしてください。
          </p>
          <input
            ref={inputRef}
            type="text"
            readOnly
            value={url}
            aria-label="回答用リンク"
            aria-describedby={hintId}
            onFocus={(e) => e.currentTarget.select()}
            className="grouped field px-4 py-3 text-[0.9375rem]"
          />
        </div>
      )}
    </div>
  );
}
